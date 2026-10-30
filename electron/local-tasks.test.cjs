const assert = require("node:assert/strict");
const { test } = require("node:test");
const Database = require("better-sqlite3-multiple-ciphers");
const {
  acknowledgeSyncOperations,
  createLocalTask,
  deleteLocalTask,
  getLocalTask,
  listPendingSyncOperations,
  updateLocalTask,
  upsertLocalTasks,
} = require("./local-tasks.cjs");

function createDatabase() {
  const database = new Database(":memory:");
  database.exec(`
    CREATE TABLE tasks (
      id TEXT PRIMARY KEY, account_id TEXT NOT NULL, title TEXT NOT NULL,
      description TEXT NOT NULL, status TEXT NOT NULL, priority TEXT NOT NULL,
      tags_json TEXT NOT NULL, due_date TEXT, completed_at TEXT,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT,
      remote_updated_at TEXT, sync_state TEXT NOT NULL
    );
    CREATE TABLE sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT, operation_id TEXT NOT NULL UNIQUE,
      account_id TEXT NOT NULL, task_id TEXT NOT NULL, operation TEXT NOT NULL,
      payload_json TEXT NOT NULL, client_updated_at TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0, last_error TEXT, created_at TEXT NOT NULL
    );
  `);
  return database;
}

const taskInput = { title: "初稿", description: "", status: "todo", priority: "medium", tags: [] };

test("同一任务离线多次修改只回放最新快照，确认后清理旧操作", () => {
  const database = createDatabase();
  try {
    const task = createLocalTask(database, "account", taskInput);
    const edited = updateLocalTask(database, "account", task.id, { ...taskInput, title: "终稿" });
    assert.ok(Date.parse(edited.updatedAt) > Date.parse(task.updatedAt));

    const pending = listPendingSyncOperations(database, "account");
    assert.equal(pending.length, 1);
    assert.equal(pending[0].payload.title, "终稿");
    assert.equal(database.prepare("SELECT COUNT(*) AS total FROM sync_queue").get().total, 2);

    acknowledgeSyncOperations(database, "account", [{ operationId: pending[0].operationId }]);
    assert.equal(database.prepare("SELECT COUNT(*) AS total FROM sync_queue").get().total, 0);
    assert.equal(getLocalTask(database, "account", task.id).title, "终稿");
  } finally {
    database.close();
  }
});

test("回放期间新增编辑不会被旧操作的确认或远端导入覆盖", () => {
  const database = createDatabase();
  try {
    const task = createLocalTask(database, "account", taskInput);
    const inFlight = listPendingSyncOperations(database, "account")[0];
    updateLocalTask(database, "account", task.id, { ...taskInput, title: "稍后编辑" });

    acknowledgeSyncOperations(database, "account", [{ operationId: inFlight.operationId }]);
    upsertLocalTasks(database, "account", [{ ...task, title: "旧服务端响应", updatedAt: "2099-01-01T00:00:00.000Z" }]);

    assert.equal(getLocalTask(database, "account", task.id).title, "稍后编辑");
    assert.equal(listPendingSyncOperations(database, "account").length, 1);
  } finally {
    database.close();
  }
});

test("离线创建后删除仅回放删除，远端旧快照不能复活待删除任务", () => {
  const database = createDatabase();
  try {
    const task = createLocalTask(database, "account", taskInput);
    deleteLocalTask(database, "account", task.id);
    upsertLocalTasks(database, "account", [{ ...task, updatedAt: "2099-01-01T00:00:00.000Z" }]);

    const pending = listPendingSyncOperations(database, "account");
    assert.equal(pending.length, 1);
    assert.equal(pending[0].operation, "delete");
    assert.equal(getLocalTask(database, "account", task.id), null);
  } finally {
    database.close();
  }
});
