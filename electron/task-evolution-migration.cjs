function migrateTaskEvolution(database) {
  database.transaction(() => {
    const columns = database.prepare("PRAGMA table_info(tasks)").all();
    if (!columns.some((column) => column.name === "evolution_json")) {
      database.exec("ALTER TABLE tasks ADD COLUMN evolution_json TEXT");
    }
    database.exec(`
      CREATE TABLE IF NOT EXISTS sync_conflicts (
        account_id TEXT NOT NULL, task_id TEXT NOT NULL, operation_id TEXT NOT NULL,
        remote_json TEXT NOT NULL, detected_at TEXT NOT NULL,
        PRIMARY KEY (account_id, task_id)
      );
      CREATE TABLE IF NOT EXISTS sync_resolutions (
        account_id TEXT NOT NULL, resolution_id TEXT NOT NULL, task_id TEXT NOT NULL,
        input_json TEXT NOT NULL, copy_task_id TEXT,
        PRIMARY KEY (account_id, resolution_id)
      );
    `);
  })();
}
module.exports = { migrateTaskEvolution };
