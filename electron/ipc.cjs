const { ipcMain } = require("electron");

const { getDatabase } = require("./database.cjs");
const { clearStoredAuth, getStoredAuth, setStoredAuth } = require("./auth.cjs");
const {
  createLocalTask,
  deleteLocalTask,
  getLocalTask,
  listLocalTasks,
  upsertLocalTasks,
  updateLocalTask,
  updateLocalTaskStatus,
} = require("./local-tasks.cjs");

const PRODUCTION_ORIGIN = "https://www.uta4k.top";
const LOCAL_ORIGINS = new Set(["http://127.0.0.1:3000", "http://localhost:3000", "app://taskflow"]);

function getTrustedOrigins() {
  const origins = new Set([PRODUCTION_ORIGIN, ...LOCAL_ORIGINS]);
  const configuredUrl = process.env.ELECTRON_START_URL || process.env.TASKFLOW_WEB_URL;

  if (configuredUrl) {
    try {
      const origin = new URL(configuredUrl);
      if (["http:", "https:", "app:"].includes(origin.protocol)) {
        origins.add(origin.origin);
      }
    } catch {
      // Invalid configuration is handled by the window loader.
    }
  }

  return origins;
}

function assertTrustedSender(event) {
  const senderUrl = event.senderFrame?.url || event.sender.getURL();

  try {
    const parsedUrl = new URL(senderUrl);
    const senderOrigin = parsedUrl.protocol === "app:" ? `app://${parsedUrl.host}` : parsedUrl.origin;
    if (!getTrustedOrigins().has(senderOrigin)) {
      throw new Error("当前页面没有本地任务存储权限。");
    }
  } catch (error) {
    if (error instanceof Error && error.message === "当前页面没有本地任务存储权限。") {
      throw error;
    }

    throw new Error("当前页面没有本地任务存储权限。", { cause: error });
  }
}

function registerIpcHandlers() {
  ipcMain.handle("taskflow:auth:get", async (event) => {
    assertTrustedSender(event);
    return getStoredAuth();
  });

  ipcMain.handle("taskflow:auth:set", async (event, input) => {
    assertTrustedSender(event);
    await setStoredAuth(input);
  });

  ipcMain.handle("taskflow:auth:clear", async (event) => {
    assertTrustedSender(event);
    await clearStoredAuth();
  });

  ipcMain.handle("taskflow:local-tasks:list", (event, input) => {
    assertTrustedSender(event);
    return listLocalTasks(getDatabase(), input?.accountId);
  });

  ipcMain.handle("taskflow:local-tasks:get", (event, input) => {
    assertTrustedSender(event);
    return getLocalTask(getDatabase(), input?.accountId, input?.taskId);
  });

  ipcMain.handle("taskflow:local-tasks:upsert", (event, input) => {
    assertTrustedSender(event);
    return upsertLocalTasks(getDatabase(), input?.accountId, input?.tasks);
  });

  ipcMain.handle("taskflow:local-tasks:create", (event, input) => {
    assertTrustedSender(event);
    return createLocalTask(getDatabase(), input?.accountId, input?.task);
  });

  ipcMain.handle("taskflow:local-tasks:update", (event, input) => {
    assertTrustedSender(event);
    return updateLocalTask(getDatabase(), input?.accountId, input?.taskId, input?.task);
  });

  ipcMain.handle("taskflow:local-tasks:update-status", (event, input) => {
    assertTrustedSender(event);
    return updateLocalTaskStatus(getDatabase(), input?.accountId, input?.taskId, input?.status);
  });

  ipcMain.handle("taskflow:local-tasks:delete", (event, input) => {
    assertTrustedSender(event);
    deleteLocalTask(getDatabase(), input?.accountId, input?.taskId);
  });
}

module.exports = { registerIpcHandlers };
