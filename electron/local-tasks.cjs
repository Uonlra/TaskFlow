const crypto = require("node:crypto");

const TASK_STATUSES = new Set(["todo", "in_progress", "done"]);
const TASK_PRIORITIES = new Set(["low", "medium", "high"]);

function normalizeAccountId(accountId) {
  if (typeof accountId !== "string" || accountId.trim().length === 0) {
    throw new TypeError("本地任务操作缺少账户标识。");
  }

  return accountId.trim();
}

function normalizeTaskInput(input) {
  if (!input || typeof input !== "object") {
    throw new TypeError("任务信息格式不正确。");
  }

  const title = typeof input.title === "string" ? input.title.trim() : "";
  const description = typeof input.description === "string" ? input.description : "";
  const status = input.status ?? "todo";
  const priority = input.priority ?? "medium";

  if (!title) throw new TypeError("标题至少需要 1 个字符。");
  if (!TASK_STATUSES.has(status)) throw new TypeError("任务状态不正确。");
  if (!TASK_PRIORITIES.has(priority)) throw new TypeError("任务优先级不正确。");

  const tags = Array.from(
    new Set(
      (Array.isArray(input.tags) ? input.tags : String(input.tags ?? "").split(/[，,]/))
        .filter((tag) => typeof tag === "string")
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  );

  return {
    title,
    description,
    status,
    priority,
    tags,
    dueDate: typeof input.dueDate === "string" && input.dueDate ? input.dueDate : undefined,
  };
}

function mapTaskRow(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    tags: JSON.parse(row.tags_json),
    dueDate: row.due_date ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at ?? undefined,
  };
}

function queueOperation(database, input) {
  // Retain older entries until the newest snapshot is acknowledged. A new
  // edit can arrive while a previous snapshot is already in flight.
  database
    .prepare(
      `INSERT INTO sync_queue
        (operation_id, account_id, task_id, operation, payload_json, client_updated_at, created_at)
       VALUES (@operationId, @accountId, @taskId, @operation, @payloadJson, @clientUpdatedAt, @createdAt)`,
    )
    .run({
      operationId: crypto.randomUUID(),
      accountId: input.accountId,
      taskId: input.taskId,
      operation: input.operation,
      payloadJson: JSON.stringify(input.payload),
      clientUpdatedAt: input.clientUpdatedAt,
      createdAt: input.clientUpdatedAt,
    });
}

function createLocalTask(database, accountId, input) {
  const normalizedAccountId = normalizeAccountId(accountId);
  const taskInput = normalizeTaskInput(input);
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const task = {
    id,
    title: taskInput.title,
    description: taskInput.description,
    status: taskInput.status,
    priority: taskInput.priority,
    tags: taskInput.tags,
    dueDate: taskInput.dueDate,
    createdAt: now,
    updatedAt: now,
    completedAt: taskInput.status === "done" ? now : undefined,
  };

  const transaction = database.transaction(() => {
    database
      .prepare(
        `INSERT INTO tasks
          (id, account_id, title, description, status, priority, tags_json, due_date, completed_at, created_at, updated_at, sync_state)
         VALUES (@id, @accountId, @title, @description, @status, @priority, @tagsJson, @dueDate, @completedAt, @createdAt, @updatedAt, 'pending')`,
      )
      .run({
        id: task.id,
        accountId: normalizedAccountId,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        tagsJson: JSON.stringify(task.tags),
        dueDate: task.dueDate ?? null,
        completedAt: task.completedAt ?? null,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
      });

    queueOperation(database, {
      accountId: normalizedAccountId,
      taskId: task.id,
      operation: "upsert",
      payload: task,
      clientUpdatedAt: task.updatedAt,
    });
  });

  transaction();
  return task;
}

function updateLocalTask(database, accountId, taskId, input) {
  const normalizedAccountId = normalizeAccountId(accountId);
  const taskInput = normalizeTaskInput(input);
  const current = getTaskRow(database, normalizedAccountId, taskId);
  if (!current) throw new Error("任务不存在。");

  const now = nextTaskTimestamp(current.updated_at);
  const task = {
    id: current.id,
    title: taskInput.title,
    description: taskInput.description,
    status: taskInput.status,
    priority: taskInput.priority,
    tags: taskInput.tags,
    dueDate: taskInput.dueDate,
    createdAt: current.created_at,
    updatedAt: now,
    completedAt: taskInput.status === "done" ? (current.completed_at ?? now) : undefined,
  };

  const transaction = database.transaction(() => {
    database
      .prepare(
        `UPDATE tasks
         SET title = @title, description = @description, status = @status, priority = @priority,
             tags_json = @tagsJson, due_date = @dueDate, completed_at = @completedAt,
             updated_at = @updatedAt, deleted_at = NULL, sync_state = 'pending'
         WHERE id = @id AND account_id = @accountId AND deleted_at IS NULL`,
      )
      .run({
        id: task.id,
        accountId: normalizedAccountId,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        tagsJson: JSON.stringify(task.tags),
        dueDate: task.dueDate ?? null,
        completedAt: task.completedAt ?? null,
        updatedAt: task.updatedAt,
      });

    queueOperation(database, {
      accountId: normalizedAccountId,
      taskId: task.id,
      operation: "upsert",
      payload: task,
      clientUpdatedAt: task.updatedAt,
    });
  });

  transaction();
  return task;
}

function updateLocalTaskStatus(database, accountId, taskId, status) {
  const current = getTaskRow(database, normalizeAccountId(accountId), taskId);
  if (!current) throw new Error("任务不存在。");
  return updateLocalTask(database, accountId, taskId, {
    title: current.title,
    description: current.description,
    status,
    priority: current.priority,
    tags: JSON.parse(current.tags_json),
    dueDate: current.due_date ?? undefined,
  });
}

function getTaskRow(database, accountId, taskId) {
  if (typeof taskId !== "string" || taskId.trim().length === 0) {
    throw new TypeError("任务标识不正确。");
  }

  return database
    .prepare("SELECT * FROM tasks WHERE id = ? AND account_id = ? AND deleted_at IS NULL")
    .get(taskId, accountId);
}

function getLocalTask(database, accountId, taskId) {
  const row = getTaskRow(database, normalizeAccountId(accountId), taskId);
  return row ? mapTaskRow(row) : null;
}

function listLocalTasks(database, accountId) {
  const normalizedAccountId = normalizeAccountId(accountId);
  return database
    .prepare("SELECT * FROM tasks WHERE account_id = ? AND deleted_at IS NULL ORDER BY updated_at DESC, id DESC")
    .all(normalizedAccountId)
    .map(mapTaskRow);
}

function upsertLocalTasks(database, accountId, tasks) {
  const normalizedAccountId = normalizeAccountId(accountId);
  if (!Array.isArray(tasks)) throw new TypeError("任务列表格式不正确。");

  const transaction = database.transaction(() => {
    const statement = database.prepare(`
      INSERT INTO tasks
        (id, account_id, title, description, status, priority, tags_json, due_date, completed_at,
         created_at, updated_at, deleted_at, remote_updated_at, sync_state)
      VALUES
        (@id, @accountId, @title, @description, @status, @priority, @tagsJson, @dueDate, @completedAt,
         @createdAt, @updatedAt, NULL, @remoteUpdatedAt, 'synced')
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        description = excluded.description,
        status = excluded.status,
        priority = excluded.priority,
        tags_json = excluded.tags_json,
        due_date = excluded.due_date,
        completed_at = excluded.completed_at,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at,
        deleted_at = NULL,
        remote_updated_at = excluded.remote_updated_at,
        sync_state = 'synced'
      WHERE tasks.account_id = excluded.account_id
        AND tasks.updated_at <= excluded.updated_at
        AND NOT EXISTS (
          SELECT 1 FROM sync_queue
          WHERE sync_queue.account_id = tasks.account_id
            AND sync_queue.task_id = tasks.id
        )
    `);

    for (const input of tasks) {
      const task = normalizeImportedTask(input);
      statement.run({
        id: task.id,
        accountId: normalizedAccountId,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        tagsJson: JSON.stringify(task.tags),
        dueDate: task.dueDate ?? null,
        completedAt: task.completedAt ?? null,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        remoteUpdatedAt: task.updatedAt,
      });
    }
  });

  transaction();
  return listLocalTasks(database, normalizedAccountId);
}

function deleteLocalTask(database, accountId, taskId) {
  const normalizedAccountId = normalizeAccountId(accountId);
  const current = getTaskRow(database, normalizedAccountId, taskId);
  if (!current) return;

  const deletedAt = nextTaskTimestamp(current.updated_at);
  const transaction = database.transaction(() => {
    database
      .prepare(
        `UPDATE tasks
         SET deleted_at = @deletedAt, updated_at = @deletedAt, sync_state = 'pending'
         WHERE id = @id AND account_id = @accountId`,
      )
      .run({ id: taskId, accountId: normalizedAccountId, deletedAt });

    queueOperation(database, {
      accountId: normalizedAccountId,
      taskId,
      operation: "delete",
      payload: { id: taskId, deletedAt },
      clientUpdatedAt: deletedAt,
    });
  });

  transaction();
}

function listPendingSyncOperations(database, accountId, limit = 50) {
  const normalizedAccountId = normalizeAccountId(accountId);
  const normalizedLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 100) : 50;

  return database
    .prepare(
      `SELECT queue.operation_id, queue.account_id, queue.task_id, queue.operation,
              queue.payload_json, queue.client_updated_at, queue.attempts, queue.last_error, queue.created_at
       FROM sync_queue AS queue
       WHERE queue.account_id = ?
         AND queue.id = (
           SELECT MAX(latest.id) FROM sync_queue AS latest
           WHERE latest.account_id = queue.account_id AND latest.task_id = queue.task_id
         )
       ORDER BY queue.id ASC
       LIMIT ?`,
    )
    .all(normalizedAccountId, normalizedLimit)
    .map((row) => ({
      operationId: row.operation_id,
      accountId: row.account_id,
      taskId: row.task_id,
      operation: row.operation,
      payload: JSON.parse(row.payload_json),
      clientUpdatedAt: row.client_updated_at,
      attempts: row.attempts,
      lastError: row.last_error ?? undefined,
      createdAt: row.created_at,
    }));
}

function acknowledgeSyncOperations(database, accountId, operations) {
  const normalizedAccountId = normalizeAccountId(accountId);
  if (!Array.isArray(operations)) throw new TypeError("同步确认列表格式不正确。");

  const transaction = database.transaction(() => {
    const getOperation = database.prepare(
      `SELECT id, task_id, client_updated_at
       FROM sync_queue
       WHERE operation_id = ? AND account_id = ?`,
    );
    const deleteOperation = database.prepare("DELETE FROM sync_queue WHERE account_id = ? AND task_id = ? AND id <= ?");
    const markTaskSynced = database.prepare(
      `UPDATE tasks
       SET sync_state = 'synced'
       WHERE account_id = ?
         AND id = ?
         AND updated_at <= ?
         AND NOT EXISTS (
           SELECT 1 FROM sync_queue
           WHERE sync_queue.account_id = tasks.account_id
             AND sync_queue.task_id = tasks.id
         )`,
    );

    for (const input of operations) {
      if (!input || typeof input.operationId !== "string") continue;

      const row = getOperation.get(input.operationId, normalizedAccountId);
      if (!row) continue;

      deleteOperation.run(normalizedAccountId, row.task_id, row.id);
      markTaskSynced.run(normalizedAccountId, row.task_id, row.client_updated_at);
    }
  });

  transaction();
}

function recordSyncOperationFailures(database, accountId, failures) {
  const normalizedAccountId = normalizeAccountId(accountId);
  if (!Array.isArray(failures)) throw new TypeError("同步失败列表格式不正确。");

  const update = database.prepare(
    `UPDATE sync_queue
     SET attempts = attempts + 1, last_error = ?
     WHERE operation_id = ? AND account_id = ?`,
  );

  const transaction = database.transaction(() => {
    for (const failure of failures) {
      if (!failure || typeof failure.operationId !== "string") continue;
      const message = typeof failure.message === "string" ? failure.message.slice(0, 500) : "同步失败。";
      update.run(message, failure.operationId, normalizedAccountId);
    }
  });

  transaction();
}

module.exports = {
  acknowledgeSyncOperations,
  createLocalTask,
  deleteLocalTask,
  getLocalTask,
  listPendingSyncOperations,
  listLocalTasks,
  recordSyncOperationFailures,
  upsertLocalTasks,
  updateLocalTask,
  updateLocalTaskStatus,
};

function normalizeImportedTask(input) {
  const task = normalizeTaskInput(input);
  if (typeof input.id !== "string" || !input.id.trim()) throw new TypeError("任务标识不正确。");
  const createdAt = typeof input.createdAt === "string" ? input.createdAt : new Date().toISOString();
  const updatedAt = typeof input.updatedAt === "string" ? input.updatedAt : createdAt;
  return { ...task, id: input.id, createdAt, updatedAt };
}

function nextTaskTimestamp(previous) {
  const lastTime = Date.parse(previous);
  return new Date(Math.max(Date.now(), Number.isFinite(lastTime) ? lastTime + 1 : 0)).toISOString();
}
