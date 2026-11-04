const crypto = require("node:crypto");
const { listLocalTasks } = require("./local-tasks.cjs");

const LOCAL_WORKSPACE = "local:device";

function getWorkspace(database) {
  database.exec("CREATE TABLE IF NOT EXISTS desktop_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)");
  const row = database.prepare("SELECT value FROM desktop_settings WHERE key = 'workspace'").get();
  return row ? JSON.parse(row.value) : { accountId: LOCAL_WORKSPACE, syncEnabled: false };
}

function setWorkspace(database, workspace) {
  database
    .prepare("INSERT OR REPLACE INTO desktop_settings (key, value) VALUES ('workspace', ?)")
    .run(JSON.stringify(workspace));
  return workspace;
}

function connectWorkspace(database, accountId) {
  if (typeof accountId !== "string" || !accountId.trim() || accountId === LOCAL_WORKSPACE) {
    throw new Error("请选择有效的云端账户。");
  }
  const previous = getWorkspace(database);
  return database.transaction(() => {
    if (previous.accountId === LOCAL_WORKSPACE) {
      const tasks = listLocalTasks(database, LOCAL_WORKSPACE);
      database
        .prepare("UPDATE tasks SET account_id = ?, sync_state = 'pending' WHERE account_id = ?")
        .run(accountId, LOCAL_WORKSPACE);
      const enqueue = database.prepare(`INSERT INTO sync_queue
        (operation_id, account_id, task_id, operation, payload_json, client_updated_at, created_at)
        VALUES (?, ?, ?, 'upsert', ?, ?, ?)`);
      for (const task of tasks) {
        enqueue.run(crypto.randomUUID(), accountId, task.id, JSON.stringify(task), task.updatedAt, task.updatedAt);
      }
    }
    return setWorkspace(database, { accountId, syncEnabled: true });
  })();
}

function pauseWorkspace(database) {
  return setWorkspace(database, { ...getWorkspace(database), syncEnabled: false });
}

module.exports = { getWorkspace, connectWorkspace, pauseWorkspace, LOCAL_WORKSPACE };
