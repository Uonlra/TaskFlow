const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");

const { app, safeStorage } = require("electron");
const Database = require("better-sqlite3-multiple-ciphers");

const DATABASE_FILENAME = "taskflow.sqlite";
const DATABASE_KEY_FILENAME = "taskflow.sqlite.key";

let database;

async function readOrCreateDatabaseKey(keyPath) {
  const encryptionAvailable = await safeStorage.isAsyncEncryptionAvailable();

  if (!encryptionAvailable) {
    throw new Error("系统安全存储暂不可用，无法初始化本地任务数据库。");
  }

  try {
    const encryptedKey = await fs.readFile(keyPath);
    const decrypted = await safeStorage.decryptStringAsync(encryptedKey);

    if (decrypted.shouldReEncrypt) {
      const rotatedKey = await safeStorage.encryptStringAsync(decrypted.result);
      await fs.writeFile(keyPath, rotatedKey, { mode: 0o600 });
    }

    return Buffer.from(decrypted.result, "base64");
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw new Error("本地数据库密钥无法解密，请检查当前 Windows 用户会话。", { cause: error });
    }
  }

  const key = crypto.randomBytes(32);
  const encryptedKey = await safeStorage.encryptStringAsync(key.toString("base64"));
  await fs.writeFile(keyPath, encryptedKey, { mode: 0o600 });
  return key;
}

async function initializeDatabase() {
  if (database) {
    return database;
  }

  const userDataPath = app.getPath("userData");
  await fs.mkdir(userDataPath, { recursive: true });

  const databasePath = path.join(userDataPath, DATABASE_FILENAME);
  const keyPath = path.join(userDataPath, DATABASE_KEY_FILENAME);
  const key = await readOrCreateDatabaseKey(keyPath);
  const connection = new Database(databasePath);

  try {
    connection.pragma("cipher='sqlcipher'");
    connection.pragma("legacy=4");
    connection.key(key);
    connection.pragma("journal_mode = WAL");
    connection.pragma("foreign_keys = ON");
    connection.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL,
        priority TEXT NOT NULL,
        tags_json TEXT NOT NULL DEFAULT '[]',
        due_date TEXT,
        completed_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        remote_updated_at TEXT,
        sync_state TEXT NOT NULL DEFAULT 'pending'
      );

      CREATE INDEX IF NOT EXISTS tasks_account_updated_idx
        ON tasks (account_id, updated_at DESC);

      CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        operation_id TEXT NOT NULL UNIQUE,
        account_id TEXT NOT NULL,
        task_id TEXT NOT NULL,
        operation TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        client_updated_at TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        last_error TEXT,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS sync_queue_pending_idx
        ON sync_queue (account_id, created_at ASC);
    `);

    database = connection;
    return database;
  } catch (error) {
    connection.close();
    throw new Error("本地任务数据库初始化失败。", { cause: error });
  }
}

function getDatabase() {
  if (!database) {
    throw new Error("本地任务数据库尚未初始化。");
  }

  return database;
}

function closeDatabase() {
  if (database?.open) {
    database.close();
  }

  database = undefined;
}

module.exports = {
  closeDatabase,
  getDatabase,
  initializeDatabase,
};
