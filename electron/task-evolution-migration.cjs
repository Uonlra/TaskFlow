function migrateTaskEvolution(database) {
  database.transaction(() => {
    const columns = database.prepare("PRAGMA table_info(tasks)").all();
    if (!columns.some((column) => column.name === "evolution_json")) {
      database.exec("ALTER TABLE tasks ADD COLUMN evolution_json TEXT");
    }
  })();
}
module.exports = { migrateTaskEvolution };
