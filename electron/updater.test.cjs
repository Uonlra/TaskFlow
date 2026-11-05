const { test } = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { createUpdateController } = require("./updater.cjs");

function setup(version = "2.2.0-beta.1", packaged = true) {
  const updater = new EventEmitter();
  let checks = 0,
    downloads = 0,
    installs = 0;
  updater.checkForUpdates = async () => {
    checks++;
    updater.emit("update-available", { version: "2.2.0-beta.2" });
  };
  updater.downloadUpdate = async () => {
    downloads++;
    updater.emit("update-downloaded", { version: "2.2.0-beta.2" });
  };
  updater.quitAndInstall = () => {
    installs++;
  };
  const controller = createUpdateController({
    app: { isPackaged: packaged, getVersion: () => version },
    updater,
    platform: "win32",
  });
  return { updater, controller, counts: () => ({ checks, downloads, installs }) };
}

test("beta 和正式版通道隔离且禁止降级", () => {
  const beta = setup();
  assert.equal(beta.updater.channel, "beta");
  assert.equal(beta.updater.allowPrerelease, true);
  const stable = setup("2.2.0");
  assert.equal(stable.updater.channel, "latest");
  assert.equal(stable.updater.allowPrerelease, false);
  assert.equal(beta.updater.allowDowngrade, false);
  assert.equal(stable.updater.allowDowngrade, false);
});

test("检查不自动下载，下载不自动安装，已下载后检查不丢失安装入口", async () => {
  const { controller, updater, counts } = setup();
  await Promise.all([controller.check(), controller.check()]);
  assert.deepEqual(counts(), { checks: 1, downloads: 0, installs: 0 });
  assert.equal(updater.autoDownload, false);
  assert.equal(updater.autoInstallOnAppQuit, false);
  assert.throws(() => controller.install());
  await Promise.all([controller.download(), controller.download()]);
  await controller.check();
  assert.equal(controller.getState().phase, "downloaded");
  assert.deepEqual(counts(), { checks: 1, downloads: 1, installs: 0 });
  controller.install();
  assert.equal(counts().installs, 1);
});

test("离线检查失败可重试，下载校验失败不能安装", async () => {
  const { updater, controller } = setup();
  updater.checkForUpdates = async () => {
    throw new Error("network");
  };
  await controller.check();
  assert.equal(controller.getState().phase, "error");
  updater.checkForUpdates = async () => updater.emit("update-available", { version: "2.2.0-beta.2" });
  await controller.check();
  updater.downloadUpdate = async () => {
    updater.emit("error", new Error("checksum mismatch"));
    throw new Error("checksum mismatch");
  };
  await controller.download();
  assert.equal(controller.getState().phase, "error");
  assert.throws(() => controller.install());
});

test("开发环境不发起更新请求", async () => {
  const { controller, counts } = setup("2.2.0-beta.1", false);
  await controller.check();
  await controller.download();
  assert.deepEqual(counts(), { checks: 0, downloads: 0, installs: 0 });
});
