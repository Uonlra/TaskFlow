const { ipcMain } = require("electron");

const { getDatabase } = require("./database.cjs");
const { clearStoredAuth, getStoredAuth, setStoredAuth } = require("./auth.cjs");
const { getWorkspace, connectWorkspace, pauseWorkspace } = require("./workspace.cjs");
const {
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

function getActiveDatabase(input) {
  const database = getDatabase();
  if (getWorkspace(database).accountId !== input?.accountId) throw new Error("工作区已切换，请重试操作。");
  return database;
}

function registerIpcHandlers({ updates } = {}) {
  for (const [action, method] of [
    ["state", "getState"],
    ["check", "check"],
    ["download", "download"],
    ["install", "install"],
  ]) {
    ipcMain.handle(`taskflow:updates:${action}`, (event) => {
      assertTrustedSender(event);
      const url = new URL(event.senderFrame?.url || event.sender.getURL());
      if (!(url.protocol === "app:" && url.host === "taskflow") || event.senderFrame !== event.sender.mainFrame)
        throw new Error("请在桌面应用中操作更新。");
      return updates[method]();
    });
  }
  ipcMain.handle("taskflow:workspace:get", (event) => {
    assertTrustedSender(event);
    return getWorkspace(getDatabase());
  });
  ipcMain.handle("taskflow:workspace:connect", async (event) => {
    assertTrustedSender(event);
    const auth = await getStoredAuth();
    if (!auth?.user?.id) throw new Error("请先登录云端账户。");
    return connectWorkspace(getDatabase(), auth.user.id);
  });
  ipcMain.handle("taskflow:workspace:pause", (event) => {
    assertTrustedSender(event);
    return pauseWorkspace(getDatabase());
  });
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
    pauseWorkspace(getDatabase());
    await clearStoredAuth();
  });

  ipcMain.handle("taskflow:local-tasks:list", (event, input) => {
    assertTrustedSender(event);
    return listLocalTasks(getActiveDatabase(input), input?.accountId);
  });

  ipcMain.handle("taskflow:local-tasks:get", (event, input) => {
    assertTrustedSender(event);
    return getLocalTask(getActiveDatabase(input), input?.accountId, input?.taskId);
  });

  ipcMain.handle("taskflow:local-tasks:upsert", (event, input) => {
    assertTrustedSender(event);
    return upsertLocalTasks(getActiveDatabase(input), input?.accountId, input?.tasks);
  });

  ipcMain.handle("taskflow:local-tasks:create", (event, input) => {
    assertTrustedSender(event);
    return createLocalTask(getActiveDatabase(input), input?.accountId, input?.task);
  });

  ipcMain.handle("taskflow:local-tasks:update", (event, input) => {
    assertTrustedSender(event);
    return updateLocalTask(getActiveDatabase(input), input?.accountId, input?.taskId, input?.task);
  });

  ipcMain.handle("taskflow:local-tasks:update-status", (event, input) => {
    assertTrustedSender(event);
    return updateLocalTaskStatus(getActiveDatabase(input), input?.accountId, input?.taskId, input?.status);
  });

  ipcMain.handle("taskflow:local-tasks:delete", (event, input) => {
    assertTrustedSender(event);
    deleteLocalTask(getActiveDatabase(input), input?.accountId, input?.taskId);
  });

  ipcMain.handle("taskflow:sync-queue:list", (event, input) => {
    assertTrustedSender(event);
    return listPendingSyncOperations(getDatabase(), input?.accountId, input?.limit);
  });

  ipcMain.handle("taskflow:sync-queue:acknowledge", (event, input) => {
    assertTrustedSender(event);
    acknowledgeSyncOperations(getDatabase(), input?.accountId, input?.operations);
  });

  ipcMain.handle("taskflow:sync-queue:fail", (event, input) => {
    assertTrustedSender(event);
    recordSyncOperationFailures(getDatabase(), input?.accountId, input?.failures);
  });
}

module.exports = { registerIpcHandlers };
