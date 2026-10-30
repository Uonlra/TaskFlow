const { contextBridge } = require("electron");
const { ipcRenderer } = require("electron");

const invoke = (channel, payload) => ipcRenderer.invoke(channel, payload);

contextBridge.exposeInMainWorld("taskflowDesktop", {
  isDesktop: true,
  platform: process.platform,
  version: process.versions.electron,
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
