const { createLocalTask, normalizeImportedTask, mapTaskRow, queueOperation } = require("./local-tasks.cjs");
const { restoreTaskEvolution, detachTaskEvolutionLinks } = require("./generated/task-evolution.cjs");

function latest(database, accountId, taskId) {
  return database
    .prepare("SELECT * FROM sync_queue WHERE account_id = ? AND task_id = ? ORDER BY id DESC LIMIT 1")
    .get(accountId, taskId);
}
function fingerprint(task) {
  return JSON.stringify(normalizeImportedTask(task));
}
function readSyncConflicts(database, accountId) {
  return database
    .prepare("SELECT * FROM sync_conflicts WHERE account_id = ? ORDER BY detected_at, task_id")
    .all(accountId)
    .flatMap((row) => {
      const operation = latest(database, accountId, row.task_id);
      const task = database.prepare("SELECT * FROM tasks WHERE account_id = ? AND id = ?").get(accountId, row.task_id);
      return operation && task
        ? [
            {
              taskId: row.task_id,
              operationId: operation.operation_id,
              local: mapTaskRow(task),
              remote: JSON.parse(row.remote_json),
              detectedAt: row.detected_at,
            },
          ]
        : [];
    });
}
function refreshSyncConflict(database, input) {
  const current = latest(database, input.accountId, input.taskId);
  if (!current || current.operation_id !== input.operationId) throw new Error("本地版本已有变化，请重新查看。");
  normalizeImportedTask(input.remote);
  if (input.remote.id !== input.taskId) throw new Error("云端任务不匹配。");
  const result = database
    .prepare("UPDATE sync_conflicts SET remote_json = ? WHERE account_id = ? AND task_id = ?")
    .run(JSON.stringify(input.remote), input.accountId, input.taskId);
  if (!result.changes) throw new Error("此任务的冲突已处理，请刷新列表。");
}
function readSyncResolution(database, accountId, resolutionId) {
  const row = database
    .prepare("SELECT * FROM sync_resolutions WHERE account_id = ? AND resolution_id = ?")
    .get(accountId, resolutionId);
  return row ? { taskId: row.task_id, copyTaskId: row.copy_task_id } : null;
}
function resolveSyncConflict(database, input) {
  const uuid = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;
  if (!uuid.test(input.resolutionId) || !uuid.test(input.copyTaskId)) throw new Error("恢复操作标识不正确。");
  if (!["keep_both", "use_cloud"].includes(input.mode)) throw new Error("恢复方式不正确。");
  if (input.mode === "use_cloud" && input.discardConfirmed !== true) throw new Error("请确认替换本地未同步的修改。");
  const signature = JSON.stringify([
    input.taskId,
    input.operationId,
    input.mode,
    input.copyTaskId,
    fingerprint(input.expectedRemote),
  ]);
  return database.transaction(() => {
    const receipt = database
      .prepare("SELECT * FROM sync_resolutions WHERE account_id = ? AND resolution_id = ?")
      .get(input.accountId, input.resolutionId);
    if (receipt) {
      if (receipt.input_json !== signature) throw new Error("恢复操作已用于另一份选择。");
      return { taskId: receipt.task_id, copyTaskId: receipt.copy_task_id };
    }
    const conflict = readSyncConflicts(database, input.accountId).find((row) => row.taskId === input.taskId);
    if (!conflict || conflict.operationId !== input.operationId) throw new Error("本地版本已有变化，请重新查看。");
    if (
      fingerprint(input.remote) !== fingerprint(input.expectedRemote) ||
      fingerprint(conflict.remote) !== fingerprint(input.expectedRemote)
    )
      throw new Error("云端版本已有变化，请重新查看。");
    const remote = normalizeImportedTask(input.remote);
    if (remote.id !== input.taskId) throw new Error("云端任务不匹配。");
    let copyTaskId = null;
    if (input.mode === "keep_both") {
      const now = new Date().toISOString();
      const copy = {
        ...conflict.local,
        id: input.copyTaskId,
        tags: [...new Set([...conflict.local.tags, "本地副本"])],
        deletedAt: undefined,
        createdAt: now,
        updatedAt: now,
      };
      if (copy.evolution) copy.evolution = restoreTaskEvolution(copy.evolution, copy.id);
      createLocalTask(database, input.accountId, copy, copy);
      copyTaskId = copy.id;
    }
    preserveUncommittedDescendants(database, input.accountId, input.taskId, remote);
    database.prepare("DELETE FROM sync_queue WHERE account_id = ? AND task_id = ?").run(input.accountId, input.taskId);
    // Explicit user resolution is the only path that replaces divergent local history.
    database
      .prepare(
        `UPDATE tasks SET title=@title, description=@description, status=@status, priority=@priority,
      tags_json=@tagsJson, due_date=@dueDate, completed_at=@completedAt, created_at=@createdAt,
      updated_at=@updatedAt, deleted_at=@deletedAt, remote_updated_at=@remoteUpdatedAt,
      evolution_json=@evolutionJson, sync_state='synced' WHERE id=@id AND account_id=@accountId`,
      )
      .run({
        ...remote,
        accountId: input.accountId,
        tagsJson: JSON.stringify(remote.tags),
        dueDate: remote.dueDate ?? null,
        completedAt: remote.completedAt ?? null,
        deletedAt: remote.deletedAt ?? null,
        updatedAt: remote.updatedAt,
        remoteUpdatedAt: input.remote.updatedAt,
        evolutionJson: remote.evolution ? JSON.stringify(remote.evolution) : null,
      });
    database
      .prepare("DELETE FROM sync_conflicts WHERE account_id = ? AND task_id = ?")
      .run(input.accountId, input.taskId);
    database
      .prepare(
        "INSERT INTO sync_resolutions (account_id,resolution_id,task_id,input_json,copy_task_id) VALUES (?,?,?,?,?)",
      )
      .run(input.accountId, input.resolutionId, input.taskId, signature, copyTaskId);
    return { taskId: input.taskId, copyTaskId };
  })();
}
function preserveUncommittedDescendants(database, accountId, sourceId, remote) {
  const detachedParents = new Set();
  const committedEvents = new Set(remote.evolution?.events.map((event) => event.id) ?? []);
  const rows = database.prepare("SELECT * FROM tasks WHERE account_id = ?").all(accountId);
  let changed = true;
  while (changed) {
    changed = false;
    for (const row of rows) {
      if (row.id === sourceId || detachedParents.has(row.id)) continue;
      const task = mapTaskRow(row);
      const state = task.evolution;
      const origin = state?.origin;
      if (!origin || state.detachedTaskLinksThrough !== undefined) continue;
      const invalid =
        (origin.taskId === sourceId && !committedEvents.has(origin.eventId)) || detachedParents.has(origin.taskId);
      if (!invalid) continue;
      const operation = latest(database, accountId, task.id);
      if (!operation) throw new Error("关联任务缺少待同步记录，未替换本地版本。");
      task.evolution = detachTaskEvolutionLinks(state);
      task.updatedAt = new Date(Math.max(Date.now(), Date.parse(task.updatedAt) + 1)).toISOString();
      database
        .prepare(
          "UPDATE tasks SET evolution_json = ?, updated_at = ?, sync_state='pending' WHERE account_id = ? AND id = ?",
        )
        .run(JSON.stringify(task.evolution), task.updatedAt, accountId, task.id);
      queueOperation(database, {
        accountId,
        taskId: task.id,
        operation: operation.operation,
        payload: task,
        clientUpdatedAt: task.updatedAt,
      });
      detachedParents.add(task.id);
      changed = true;
    }
  }
}
module.exports = { readSyncConflicts, refreshSyncConflict, readSyncResolution, resolveSyncConflict };
