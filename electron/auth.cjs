const fs = require("node:fs/promises");
const path = require("node:path");

const { app, safeStorage } = require("electron");

const AUTH_FILENAME = "taskflow.auth";

async function getStoredAuth() {
  const encrypted = await readEncryptedAuth();
  if (!encrypted) return null;
  const decrypted = await safeStorage.decryptStringAsync(encrypted);
  return JSON.parse(decrypted.result);
}

async function setStoredAuth(envelope) {
  assertAuthEnvelope(envelope);
  if (!(await safeStorage.isAsyncEncryptionAvailable())) {
    throw new Error("系统安全存储暂不可用，无法保存登录状态。");
  }

  const encrypted = await safeStorage.encryptStringAsync(JSON.stringify(envelope));
  await fs.writeFile(getAuthPath(), encrypted, { mode: 0o600 });
}

async function clearStoredAuth() {
  try {
    await fs.unlink(getAuthPath());
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

async function readEncryptedAuth() {
  try {
    return await fs.readFile(getAuthPath());
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw new Error("本地登录状态无法读取。", { cause: error });
  }
}

function getAuthPath() {
  return path.join(app.getPath("userData"), AUTH_FILENAME);
}

function assertAuthEnvelope(envelope) {
  if (!envelope || typeof envelope !== "object" || !envelope.user || typeof envelope.user.id !== "string") {
    throw new TypeError("登录状态格式不正确。");
  }
}

module.exports = { clearStoredAuth, getStoredAuth, setStoredAuth };
