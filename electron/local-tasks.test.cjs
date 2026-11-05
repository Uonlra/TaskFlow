const assert = require("node:assert/strict");
const { test } = require("node:test");
const Database = require("better-sqlite3-multiple-ciphers");
const {
  acknowledgeSyncOperations,
  createLocalTask,
  deleteLocalTask,
  getLocalTask,
  listPendingSyncOperations,
  listLocalTasks,
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

test("远程删除隐藏本地任务，重复导入幂等；未确认的较新编辑不被覆盖", () => {
  const database = createDatabase();
  try {
    const task = {
      ...taskInput,
      id: "deleted-remote",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    };
    upsertLocalTasks(database, "account", [task]);
    const deleted = {
      ...task,
      updatedAt: "2026-02-01T00:00:00Z",
      syncClientUpdatedAt: "2026-02-01T00:00:00Z",
      deletedAt: "2026-02-01T00:00:00Z",
    };
    upsertLocalTasks(database, "account", [deleted, deleted]);
    assert.equal(getLocalTask(database, "account", task.id), null);
    upsertLocalTasks(database, "account", [{ ...task, updatedAt: "2026-03-01T00:00:00Z" }]);
    updateLocalTask(database, "account", task.id, { ...taskInput, title: "尚未确认的新编辑" });
    upsertLocalTasks(database, "account", [deleted]);
    assert.equal(getLocalTask(database, "account", task.id).title, "尚未确认的新编辑");
    assert.equal(listPendingSyncOperations(database, "account").length, 1);
  } finally {
    database.close();
  }
});

test("本地工作区无需登录且不排队上传，主动连接后归属云端，暂停后仍可编辑", () => {
  const { getWorkspace, connectWorkspace, pauseWorkspace, LOCAL_WORKSPACE } = require("./workspace.cjs");
  const database = createDatabase();
  try {
    assert.equal(getWorkspace(database).accountId, LOCAL_WORKSPACE);
    const local = createLocalTask(database, LOCAL_WORKSPACE, taskInput);
    assert.equal(listPendingSyncOperations(database, LOCAL_WORKSPACE).length, 0);
    assert.equal(getLocalTask(database, LOCAL_WORKSPACE, local.id).title, "初稿");
    connectWorkspace(database, "account-a");
    assert.equal(getLocalTask(database, "account-a", local.id).title, "初稿");
    assert.equal(listPendingSyncOperations(database, "account-a").length, 1);
    pauseWorkspace(database);
    assert.deepEqual(getWorkspace(database), { accountId: "account-a", syncEnabled: false });
    updateLocalTask(database, "account-a", local.id, { ...taskInput, title: "退出后修改" });
    assert.equal(getLocalTask(database, "account-a", local.id).title, "退出后修改");
    connectWorkspace(database, "account-b");
    assert.equal(listLocalTasks(database, "account-b").length, 0);
    assert.equal(getLocalTask(database, "account-a", local.id).title, "退出后修改");
  } finally {
    database.close();
  }
});

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
