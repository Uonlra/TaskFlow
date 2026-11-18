const assert = require("node:assert/strict");
const { test } = require("node:test");
const { randomUUID } = require("node:crypto");
const { join } = require("node:path");
const { tmpdir } = require("node:os");
const { rmSync } = require("node:fs");
const Database = require("better-sqlite3-multiple-ciphers");
const { migrateTaskEvolution } = require("./task-evolution-migration.cjs");
const { executeTaskEvolution } = require("./generated/task-evolution.cjs");
const {
  createLocalTask,
  executeLocalTaskEvolution,
  transferLocalTaskBranch,
  getLocalTask,
  listLocalTasks,
  listPendingSyncOperations,
  recordSyncOperationFailures,
} = require("./local-tasks.cjs");
const {
  readSyncConflicts,
  resolveSyncConflict,
  readSyncResolution,
  refreshSyncConflict,
} = require("./sync-conflicts.cjs");
function open(path = ":memory:") {
  const db = new Database(path);
  db.exec(`CREATE TABLE IF NOT EXISTS tasks (id TEXT PRIMARY KEY, account_id TEXT NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL, status TEXT NOT NULL, priority TEXT NOT NULL, tags_json TEXT NOT NULL, due_date TEXT, completed_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT, remote_updated_at TEXT, sync_state TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS sync_queue (id INTEGER PRIMARY KEY AUTOINCREMENT, operation_id TEXT NOT NULL UNIQUE, account_id TEXT NOT NULL, task_id TEXT NOT NULL, operation TEXT NOT NULL, payload_json TEXT NOT NULL, client_updated_at TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, last_error TEXT, created_at TEXT NOT NULL);`);
  migrateTaskEvolution(db);
  return db;
}
const action = (task, note) => ({
  operationId: randomUUID(),
  expectedRevision: task.evolution?.revision ?? 0,
  action: { type: "record_progress", note },
});
function fixture(db) {
  const base = createLocalTask(db, "account", { title: "知识库", description: "", tags: [], status: "in_progress" });
  const local = executeLocalTaskEvolution(db, "account", base.id, action(base, "本地进展"));
  const remote = executeTaskEvolution(base, action(base, "云端进展"), new Date().toISOString());
  const pending = listPendingSyncOperations(db, "account")[0];
  recordSyncOperationFailures(db, "account", [{ operationId: pending.operationId, code: "conflict", remote }]);
  return { local: JSON.parse(JSON.stringify(local)), remote: JSON.parse(JSON.stringify(remote)), pending };
}
const resolution = (f, overrides = {}) => ({
  accountId: "account",
  taskId: f.local.id,
  operationId: f.pending.operationId,
  resolutionId: randomUUID(),
  copyTaskId: randomUUID(),
  mode: "keep_both",
  discardConfirmed: false,
  expectedRemote: f.remote,
  remote: f.remote,
  ...overrides,
});

test("conflicts and idempotent resolution receipts survive reopen; an independent copy preserves local history", () => {
  const path = join(tmpdir(), `taskflow-conflict-${randomUUID()}.sqlite`);
  let db = open(path);
  try {
    const f = fixture(db);
    const input = resolution(f);
    db.close();
    db = open(path);
    assert.equal(readSyncConflicts(db, "account").length, 1);
    assert.equal(listPendingSyncOperations(db, "account").length, 0);
    const result = resolveSyncConflict(db, input);
    assert.equal(result.copyTaskId, input.copyTaskId);
    const copy = getLocalTask(db, "account", input.copyTaskId);
    assert.deepEqual(
      copy.evolution.events.map((event) => event.command),
      f.local.evolution.events.map((event) => event.command),
    );
    assert.ok(copy.tags.includes("本地副本"));
    assert.deepEqual(getLocalTask(db, "account", f.local.id).evolution, f.remote.evolution);
    db.close();
    db = open(path);
    assert.deepEqual(resolveSyncConflict(db, input), result);
    assert.deepEqual(readSyncResolution(db, "account", input.resolutionId), result);
    assert.equal(listLocalTasks(db, "account").length, 2);
    assert.equal(listPendingSyncOperations(db, "account").length, 1);
    assert.equal(readSyncConflicts(db, "account").length, 0);
    assert.equal(readSyncResolution(db, "other", input.resolutionId), null);
  } finally {
    db.close();
    rmSync(path, { force: true });
  }
});
test("stale local and refreshed remote versions cannot apply the old choice", () => {
  const db = open();
  try {
    const f = fixture(db);
    const input = resolution(f);
    const newer = executeTaskEvolution(f.remote, action(f.remote, "更新的云端进展"), new Date().toISOString());
    assert.throws(() => resolveSyncConflict(db, { ...input, remote: newer }), /云端版本/);
    refreshSyncConflict(db, {
      accountId: "account",
      taskId: f.local.id,
      operationId: f.pending.operationId,
      remote: newer,
    });
    assert.throws(() => resolveSyncConflict(db, input), /云端版本/);
    executeLocalTaskEvolution(db, "account", f.local.id, action(f.local, "较新的本地进展"));
    assert.throws(() => resolveSyncConflict(db, input), /本地版本/);
    assert.equal(listLocalTasks(db, "account").length, 1);
    assert.equal(readSyncConflicts(db, "account").length, 1);
  } finally {
    db.close();
  }
});
test("failure after copy creation rolls back the copy, receipt and queue changes", () => {
  const db = open();
  try {
    const f = fixture(db);
    db.exec(
      `CREATE TRIGGER reject_resolution BEFORE UPDATE ON tasks WHEN NEW.id = '${f.local.id}' BEGIN SELECT RAISE(ABORT, 'forced failure'); END;`,
    );
    const input = resolution(f);
    assert.throws(() => resolveSyncConflict(db, input), /forced failure/);
    assert.equal(getLocalTask(db, "account", input.copyTaskId), null);
    assert.deepEqual(getLocalTask(db, "account", f.local.id).evolution, f.local.evolution);
    assert.equal(readSyncResolution(db, "account", input.resolutionId), null);
    assert.equal(readSyncConflicts(db, "account").length, 1);
  } finally {
    db.close();
  }
});
test("adopting a cloud tombstone requires explicit discard confirmation and never resurrects it", () => {
  const db = open();
  try {
    const f = fixture(db);
    const remote = { ...f.remote, deletedAt: new Date().toISOString() };
    refreshSyncConflict(db, { accountId: "account", taskId: f.local.id, operationId: f.pending.operationId, remote });
    const input = resolution(f, { remote, expectedRemote: remote, mode: "use_cloud" });
    assert.throws(() => resolveSyncConflict(db, input), /请确认/);
    resolveSyncConflict(db, { ...input, discardConfirmed: true });
    assert.equal(listLocalTasks(db, "account").length, 0);
    assert.equal(listPendingSyncOperations(db, "account").length, 0);
  } finally {
    db.close();
  }
});
test("uncommitted descendants are preserved and detached; healthy tasks bypass the blocked group", () => {
  const db = open();
  try {
    const f = fixture(db);
    const branchCommand = {
      operationId: "branch",
      expectedRevision: 1,
      action: { type: "create_branch", title: "方案", question: "验证？" },
    };
    const source = executeLocalTaskEvolution(db, "account", f.local.id, branchCommand);
    const transferred = transferLocalTaskBranch(db, "account", source.id, {
      operationId: "transfer",
      expectedRevision: 2,
      action: {
        type: "transfer_branch",
        branchId: "branch",
        targetTaskId: randomUUID(),
        goal: { objective: "独立任务", successCriteria: "完成验证" },
        reason: "独立",
      },
    });
    const child = transferred.task;
    const healthy = createLocalTask(db, "account", { title: "正常任务", tags: [] });
    assert.deepEqual(
      listPendingSyncOperations(db, "account", 1).map((op) => op.taskId),
      [healthy.id],
    );
    const currentConflict = readSyncConflicts(db, "account")[0];
    resolveSyncConflict(
      db,
      resolution({ ...f, local: transferred.source, pending: { operationId: currentConflict.operationId } }),
    );
    const preserved = getLocalTask(db, "account", child.id);
    assert.equal(preserved.evolution.detachedTaskLinksThrough, preserved.evolution.revision);
    assert.equal(preserved.evolution.origin.taskId, source.id);
    assert.ok(listPendingSyncOperations(db, "account").some((op) => op.taskId === child.id));
  } finally {
    db.close();
  }
});
