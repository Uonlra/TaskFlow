import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { _electron, expect as baseExpect } from "@playwright/test";

assert.equal(process.platform, "win32");
assert.ok(process.argv[2], "请提供新构建的 win-unpacked/TaskFlow.exe 路径");
const executablePath = path.resolve(process.argv[2]);
const root = path.resolve(`dist/tray-package-smoke-${Date.now()}`);
const profile = path.join(root, "profile");
await mkdir(profile, { recursive: true });
const expect = baseExpect.configure({ timeout: 30_000 });
const env = {
  ...process.env,
  TASKFLOW_DISABLE_UPDATE_CHECK: "1",
  ELECTRON_START_URL: "app://taskflow/settings/",
  TASKFLOW_WEB_URL: "app://taskflow/settings/",
};
const args = [`--user-data-dir=${profile}`];
const report = { passed: false, executablePath, profile, checks: [] };
let application,
  trayError = false,
  taskId;
async function launch() {
  application = await _electron.launch({ executablePath, args, env, timeout: 90_000 });
  application.process().stderr?.on("data", (bytes) => {
    if (bytes.toString().includes("托盘初始化失败")) trayError = true;
  });
  const page = await application.firstWindow();
  await expect(page.getByRole("region", { name: "应用更新", exact: true })).toBeVisible();
  assert.equal(await application.evaluate(({ app }) => app.getPath("userData")), profile);
  assert.equal(await application.evaluate(({ app }) => app.isPackaged), true);
  assert.equal(trayError, false);
  return page;
}
async function closeWindow() {
  const closed = application.waitForEvent("close");
  await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].close()).catch(() => undefined);
  await closed;
  application = null;
}
try {
  const require = createRequire(import.meta.url);
  const builderRequire = createRequire(require.resolve("electron-builder/package.json"));
  const archiveRequire = createRequire(builderRequire.resolve("app-builder-lib/package.json"));
  const asar = archiveRequire("@electron/asar");
  const archive = path.join(path.dirname(executablePath), "resources/app.asar");
  const icon = asar.extractFile(archive, path.join("electron", "assets", "tray.ico"));
  assert.equal(icon.readUInt16LE(2), 1);
  assert.ok(icon.readUInt16LE(4) >= 2);
  assert.ok(asar.extractFile(archive, path.join("electron", "tray.cjs")).length);
  assert.equal(
    asar.listPackage(archive).some((file) => /tray-test-main|update-test-main|\.test\.cjs$/.test(file)),
    false,
  );
  report.checks.push("打包内容包含托盘模块和多分辨率 ICO，不含验收入口或单元测试");
  let page = await launch();
  report.checks.push("打包程序使用独立 profile 正常启动，无托盘初始化错误");
  await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].hide());
  assert.equal(await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isVisible()), false);
  const second = spawn(executablePath, args, { env, windowsHide: true, stdio: "ignore" });
  const secondExit = new Promise((resolve, reject) => {
    second.once("error", reject);
    second.once("exit", (code) => (code === 0 ? resolve() : reject(new Error(`Second instance exit ${code}`))));
  });
  await expect
    .poll(() => application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isVisible()))
    .toBe(true);
  await secondExit;
  assert.equal(await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length), 1);
  report.checks.push("隐藏后再次启动恢复同一窗口，第二实例正常退出");
  taskId = await page.evaluate(async () => {
    const b = window.taskflowDesktop,
      w = await b.workspace.get();
    assertLocal(w, await b.auth.get());
    function assertLocal(workspace, auth) {
      if (workspace.syncEnabled || auth) throw new Error("必须为隔离本地工作区");
    }
    const task = await b.localTasks.create({
      accountId: w.accountId,
      task: {
        title: "托盘打包验收任务",
        description: "关闭退出后恢复",
        status: "done",
        priority: "medium",
        tags: "验收",
        dueDate: "",
      },
    });
    return task.id;
  });
  await closeWindow();
  report.checks.push("关闭主窗口正常退出进程，托盘不会使应用常驻");
  page = await launch();
  await page.evaluate(async (id) => {
    const b = window.taskflowDesktop,
      w = await b.workspace.get(),
      task = await b.localTasks.get({ accountId: w.accountId, taskId: id });
    if (!task || task.status !== "done" || task.description !== "关闭退出后恢复") throw new Error("本地任务未恢复");
    await b.localTasks.delete({ accountId: w.accountId, taskId: id });
  }, taskId);
  report.checks.push("重新启动后本地任务与完成状态恢复，仅清理本次隔离任务");
  await closeWindow();
  report.passed = true;
} catch (error) {
  report.error = error.stack ?? String(error);
  process.exitCode = 1;
} finally {
  await application?.close().catch(() => undefined);
  await writeFile(path.join(root, "report.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));
}
