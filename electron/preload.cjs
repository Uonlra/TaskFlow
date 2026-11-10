const { contextBridge } = require("electron");
const { ipcRenderer } = require("electron");

const invoke = async (channel, payload) => {
  try {
    return await ipcRenderer.invoke(channel, payload);
  } catch (error) {
    const message = String(error?.message || "桌面操作失败，请重试。").replace(
      /^Error invoking remote method '[^']+': (?:Error|TypeError): /,
      "",
    );
    throw new Error(message);
  }
};
const subscribe = (channel, listener) => {
  const handler = (_event, payload) => listener(payload);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
};

contextBridge.exposeInMainWorld("taskflowDesktop", {
  isDesktop: true,
  platform: process.platform,
  version: process.versions.electron,
  shell: {
    quickWindow: process.argv.includes("--taskflow-quick"),
    menu: () => invoke("taskflow:shell:menu"),
    theme: (dark) => invoke("taskflow:shell:theme", dark),
    onSettings: (listener) => subscribe("taskflow:shell:settings", listener),
    onTasksChanged: (listener) => subscribe("taskflow:tasks:changed", listener),
  },
  quickCapture: {
    show: () => invoke("taskflow:quick:show"),
    hide: () => invoke("taskflow:quick:hide"),
    create: (input) => invoke("taskflow:quick:create", input),
    onFocus: (listener) => subscribe("taskflow:quick:focus", listener),
  },
  shortcuts: {
    get: () => invoke("taskflow:shortcuts:get"),
    set: (input) => invoke("taskflow:shortcuts:set", input),
  },
  updates: {
    getState: () => invoke("taskflow:updates:state"),
    check: () => invoke("taskflow:updates:check"),
    download: () => invoke("taskflow:updates:download"),
    install: () => invoke("taskflow:updates:install"),
    subscribe: (listener) => {
      const handler = (_event, state) => listener(state);
      ipcRenderer.on("taskflow:updates:changed", handler);
      return () => ipcRenderer.removeListener("taskflow:updates:changed", handler);
    },
  },
  workspace: {
    get: () => invoke("taskflow:workspace:get"),
    connect: () => invoke("taskflow:workspace:connect"),
    pause: () => invoke("taskflow:workspace:pause"),
  },
  auth: {
    get: () => invoke("taskflow:auth:get"),
    set: (envelope) => invoke("taskflow:auth:set", envelope),
    clear: () => invoke("taskflow:auth:clear"),
  },
  localTasks: {
    list: (input) => invoke("taskflow:local-tasks:list", input),
    get: (input) => invoke("taskflow:local-tasks:get", input),
    upsert: (input) => invoke("taskflow:local-tasks:upsert", input),
    create: (input) => invoke("taskflow:local-tasks:create", input),
    update: (input) => invoke("taskflow:local-tasks:update", input),
    updateStatus: (input) => invoke("taskflow:local-tasks:update-status", input),
    delete: (input) => invoke("taskflow:local-tasks:delete", input),
  },
  syncQueue: {
    list: (input) => invoke("taskflow:sync-queue:list", input),
    acknowledge: (input) => invoke("taskflow:sync-queue:acknowledge", input),
    fail: (input) => invoke("taskflow:sync-queue:fail", input),
  },
});
