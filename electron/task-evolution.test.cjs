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
  getLocalTask,
  updateLocalTaskStatus,
  listPendingSyncOperations,
  settleSyncOperations,
  deleteLocalTask,
} = require("./local-tasks.cjs");

const input = { title: "知识库", description: "", status: "todo", priority: "medium", tags: [] };
const command = (operationId, expectedRevision, action) => ({ operationId, expectedRevision, action });
function open(path = ":memory:") {
  const db = new Database(path);
  db.exec(`CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY, account_id TEXT NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL,
    status TEXT NOT NULL, priority TEXT NOT NULL, tags_json TEXT NOT NULL, due_date TEXT, completed_at TEXT,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT, remote_updated_at TEXT, sync_state TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sync_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT, operation_id TEXT NOT NULL UNIQUE, account_id TEXT NOT NULL,
    task_id TEXT NOT NULL, operation TEXT NOT NULL, payload_json TEXT NOT NULL, client_updated_at TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0, last_error TEXT, created_at TEXT NOT NULL);`);
  migrateTaskEvolution(db);
  return db;
}
const start = command("branch", 0, { type: "create_branch", title: "方案 A", question: "能否提高检索效率？" });

test("migration is repeatable and preserves existing tasks", () => {
  const db = open();
  try {
    const task = createLocalTask(db, "local:device", input);
    migrateTaskEvolution(db);
    migrateTaskEvolution(db);
    assert.equal(getLocalTask(db, "local:device", task.id).title, input.title);
    assert.equal(getLocalTask(db, "local:device", task.id).evolution, undefined);
  } finally {
    db.close();
  }
});

test("SQLite restores the complete adoption and target after closing and reopening", () => {
  const path = join(tmpdir(), `taskflow-evolution-${randomUUID()}.sqlite`);
  let db = open(path);
  try {
    const task = createLocalTask(db, "local:device", input);
    executeLocalTaskEvolution(db, "local:device", task.id, start);
    executeLocalTaskEvolution(
      db,
      "local:device",
      task.id,
      command("result", 1, {
        type: "submit_result",
        branchId: "branch",
        summary: "验证有效",
        points: ["整理方法"],
      }),
    );
    const merge = command("merge", 2, {
      type: "adopt_result",
      branchId: "branch",
      resultId: "result",
      pointIds: ["result:0"],
      reason: "维护简单",
      goal: { objective: "可检索知识库", successCriteria: "检索 80 篇资料" },
    });
    const saved = executeLocalTaskEvolution(db, "local:device", task.id, merge);
    assert.equal(listPendingSyncOperations(db, "local:device").length, 0);
    db.close();
    db = open(path);
    assert.deepEqual(getLocalTask(db, "local:device", task.id), saved);
    assert.deepEqual(executeLocalTaskEvolution(db, "local:device", task.id, merge), saved);
    assert.throws(() => updateLocalTaskStatus(db, "local:device", task.id, "done"), /验收/);
  } finally {
    db.close();
    for (const suffix of ["", "-wal", "-shm"]) rmSync(`${path}${suffix}`, { force: true });
  }
});

test("queue failure rolls back the target and history together", () => {
  const db = open();
  try {
    const task = createLocalTask(db, "account", input);
    db.exec(
      "CREATE TRIGGER reject_queue BEFORE INSERT ON sync_queue BEGIN SELECT RAISE(ABORT, 'queue unavailable'); END",
    );
    assert.throws(() => executeLocalTaskEvolution(db, "account", task.id, start), /queue unavailable/);
    assert.deepEqual(getLocalTask(db, "account", task.id), task);
    assert.equal(listPendingSyncOperations(db, "account").length, 1);
  } finally {
    db.close();
  }
});

test("retries do not create duplicate events or queue entries, stale versions fail", () => {
  const db = open();
  try {
    const task = createLocalTask(db, "account", input);
    const saved = executeLocalTaskEvolution(db, "account", task.id, start);
    executeLocalTaskEvolution(db, "account", task.id, start);
    assert.equal(db.prepare("SELECT count(*) AS n FROM sync_queue").get().n, 2);
    assert.equal(saved.evolution.events.length, 2);
    assert.throws(
      () => executeLocalTaskEvolution(db, "account", task.id, { ...start, operationId: "stale" }),
      /新的修改/,
    );
    assert.throws(() => executeLocalTaskEvolution(db, "other-account", task.id, start), /不存在/);
  } finally {
    db.close();
  }
});

test("sync settlement rolls back acknowledgements on history divergence", () => {
  const db = open();
  try {
    const task = createLocalTask(db, "account", input);
    const saved = executeLocalTaskEvolution(db, "account", task.id, start);
    const queued = listPendingSyncOperations(db, "account");
    const fork = executeTaskEvolution(task, { ...start, operationId: "fork" }, "2099-01-01T00:00:00.000Z");
    assert.throws(() => settleSyncOperations(db, "account", queued, [fork]), /分叉/);
    assert.deepEqual(getLocalTask(db, "account", task.id), saved);
    assert.equal(listPendingSyncOperations(db, "account").length, 1);
    settleSyncOperations(db, "account", queued, [saved]);
    assert.equal(listPendingSyncOperations(db, "account").length, 0);
  } finally {
    db.close();
  }
});

test("offline deletion retains evolution in the tombstone payload", () => {
  const db = open();
  try {
    const task = createLocalTask(db, "account", input);
    executeLocalTaskEvolution(db, "account", task.id, start);
    deleteLocalTask(db, "account", task.id);
    const pending = listPendingSyncOperations(db, "account");
    assert.equal(pending[0].operation, "delete");
    assert.equal(pending[0].payload.evolution.revision, 1);
    assert.equal(getLocalTask(db, "account", task.id), null);
  } finally {
    db.close();
  }
});

test("a longer verified remote history advances even when the device clock is ahead", () => {
  const db = open();
  try {
    const task = createLocalTask(db, "account", input);
    const saved = executeLocalTaskEvolution(db, "account", task.id, start);
    settleSyncOperations(db, "account", listPendingSyncOperations(db, "account"), []);
    db.prepare("UPDATE tasks SET updated_at = '2099-01-01T00:00:00.000Z' WHERE id = ?").run(task.id);
    const remote = executeTaskEvolution(
      saved,
      command("note", 1, { type: "record_progress", note: "另一端进展" }),
      "2026-11-11T00:00:00.000Z",
    );
    settleSyncOperations(db, "account", [], [remote]);
    assert.equal(getLocalTask(db, "account", task.id).evolution.revision, 2);
  } finally {
    db.close();
  }
});
