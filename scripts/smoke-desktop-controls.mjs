import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { _electron, expect as baseExpect } from "@playwright/test";

const expect = baseExpect.configure({ timeout: 30000 });
const root = path.resolve(`dist/controls-smoke-${Date.now()}`);
const profile = path.join(root, "profile");
await mkdir(profile, { recursive: true });
const report = { passed: false, root, checks: [] };
let application;
let probe;
try {
  const env = {
    ...process.env,
    TASKFLOW_CONTROLS_TEST_PROFILE: profile,
    TASKFLOW_DISABLE_UPDATE_CHECK: "1",
    ELECTRON_START_URL: process.env.TASKFLOW_CONTROLS_TEST_URL || "app://taskflow/",
  };
  delete env.ELECTRON_RUN_AS_NODE;
  application = await _electron.launch({
    executablePath: process.env.TASKFLOW_CONTROLS_ELECTRON_EXE,
    args: [path.resolve("scripts/fixtures/desktop-controls-test-main.cjs")],
    env,
  });
  const main = await application.firstWindow();
  await expect(main.getByRole("button", { name: "应用菜单（F10）" })).toBeVisible();
  assert.equal(await application.evaluate(({ app }) => app.getPath("userData")), profile);
  assert.equal(await main.evaluate(() => navigator.windowControlsOverlay?.visible), true);
  await application.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()
      .find((w) => w.isMaximizable())
      .maximize(),
  );
  await expect
    .poll(() =>
      application.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows()
          .find((w) => w.isMaximizable())
          .isMaximized(),
      ),
    )
    .toBe(true);
  await application.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()
      .find((w) => w.isMaximizable())
      .unmaximize(),
  );
  await main.context().setOffline(true);
  await main.evaluate(() => window.taskflowDesktop.quickCapture.show());
  await expect.poll(() => application.windows().length).toBe(2);
  const quick = application.windows().find((page) => page !== main);
  await expect(quick.getByLabel("任务标题", { exact: true })).toBeFocused();
  await quick.getByLabel("任务标题", { exact: true }).fill("隔离环境快速记录");
  await quick.keyboard.press("Escape");
  await expect
    .poll(() =>
      application.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows()
          .find((w) => w.webContents.getURL().includes("quick-create"))
          .isVisible(),
      ),
    )
    .toBe(false);
  await main.evaluate(() => window.taskflowDesktop.quickCapture.show());
  await expect(quick.getByLabel("任务标题", { exact: true })).toHaveValue("隔离环境快速记录");
  await quick.keyboard.press("Control+Enter");
  await expect
    .poll(() =>
      main.evaluate(
        async () => (await window.taskflowDesktop.localTasks.list(await window.taskflowDesktop.workspace.get())).length,
      ),
    )
    .toBe(1);
  await expect
    .poll(() =>
      application.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows()
          .find((w) => w.webContents.getURL().includes("quick-create"))
          .isVisible(),
      ),
    )
    .toBe(false);
  report.checks.push(
    "isolated profile; quick window focuses title; Esc retains draft; Ctrl+Enter writes one local task and hides",
  );
  await main.goto(new URL("/tasks/", env.ELECTRON_START_URL).toString());
  await expect(main.getByText("隔离环境快速记录", { exact: true }).filter({ visible: true }).first()).toBeVisible();
  await main.evaluate(() => window.taskflowDesktop.quickCapture.show());
  await quick.getByLabel("任务标题", { exact: true }).fill("主窗口立即刷新");
  await quick.getByRole("button", { name: "记录任务" }).click();
  await expect(main.getByText("主窗口立即刷新", { exact: true }).filter({ visible: true }).first()).toBeVisible();
  report.checks.push("main task list refreshes after a quick-window write");
  await main.evaluate(() => window.taskflowDesktop.shortcuts.set({ enabled: false, shortcut: "Ctrl+Alt+N" }));
  assert.equal(await application.evaluate(({ globalShortcut }) => globalShortcut.isRegistered("Ctrl+Alt+N")), false);
  await main.evaluate(() => window.taskflowDesktop.shortcuts.set({ enabled: true, shortcut: "Ctrl+Alt+N" }));
  assert.equal(await application.evaluate(({ globalShortcut }) => globalShortcut.isRegistered("Ctrl+Alt+N")), true);
  await application.evaluate(({ globalShortcut }) => globalShortcut.register("Ctrl+Alt+M", () => {}));
  const conflict = await main.evaluate(() =>
    window.taskflowDesktop.shortcuts.set({ enabled: true, shortcut: "Ctrl+Alt+M" }),
  );
  assert.equal(conflict.shortcut, "Ctrl+Alt+N");
  assert.match(conflict.message, /占用/);
  await application.evaluate(({ globalShortcut }) => globalShortcut.unregister("Ctrl+Alt+M"));
  report.checks.push("shortcut disable/re-enable and conflict preserve previous registration");
  await assert.rejects(
    main.evaluate(() =>
      window.taskflowDesktop.quickCapture.create({ accountId: "local:device", task: { title: "不应写入" } }),
    ),
  );
  await assert.rejects(
    quick.evaluate(() =>
      window.taskflowDesktop.quickCapture.create({ accountId: "stale-account", task: { title: "不应写入" } }),
    ),
    /工作区/,
  );
  report.checks.push("offline creation works; wrong window and stale workspace IPC writes are rejected");
  await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().forEach((w) => w.hide()));
  const probeProfile = path.join(root, "probe-profile");
  await mkdir(probeProfile, { recursive: true });
  probe = await _electron.launch({
    executablePath: process.env.TASKFLOW_CONTROLS_ELECTRON_EXE,
    args: [path.resolve("scripts/fixtures/shortcut-probe-main.cjs")],
    env: { ...env, TASKFLOW_SHORTCUT_PROBE_PROFILE: probeProfile },
  });
  const probePage = await probe.firstWindow();
  await expect(probePage.getByRole("heading", { name: "Shortcut test" })).toBeVisible();
  await expect.poll(() => probe.evaluate(({ BrowserWindow }) => Boolean(BrowserWindow.getFocusedWindow()))).toBe(true);
  execFileSync(
    "powershell.exe",
    ["-NoProfile", "-Command", "$probeShell = New-Object -ComObject WScript.Shell; $probeShell.SendKeys('^%n')"],
    { windowsHide: true },
  );
  await expect
    .poll(() =>
      application.evaluate(
        ({ BrowserWindow }) => BrowserWindow.getFocusedWindow()?.webContents.getURL().includes("quick-create") ?? false,
      ),
    )
    .toBe(true);
  await expect(quick.getByLabel("任务标题", { exact: true })).toBeFocused();
  report.checks.push("real Windows global keystroke opens quick capture while a separate application owns focus");
  await probe.close();
  probe = null;
  await application.evaluate(({ BrowserWindow }) => {
    const window = BrowserWindow.getAllWindows().find((w) => w.isMaximizable());
    window.show();
    window.focus();
  });
  await main.goto(new URL("/settings/", env.ELECTRON_START_URL).toString());
  await main.getByRole("textbox", { name: "快捷键", exact: true }).fill("Ctrl+Alt+K");
  await main.getByRole("button", { name: "保存快捷键" }).click();
  await expect(main.getByRole("status").filter({ hasText: "当前快捷键：Ctrl+Alt+K" })).toBeVisible();
  await main.screenshot({ path: path.join(root, "main.png") });
  await main.evaluate(() => window.taskflowDesktop.quickCapture.show());
  await quick.screenshot({ path: path.join(root, "quick.png") });
  const closed = application.waitForEvent("close");
  await application
    .evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()
        .find((w) => w.isMaximizable())
        .close(),
    )
    .catch(() => undefined);
  await closed;
  application = null;
  report.checks.push("closing main window exits even when quick window exists");
  application = await _electron.launch({
    executablePath: process.env.TASKFLOW_CONTROLS_ELECTRON_EXE,
    args: [path.resolve("scripts/fixtures/desktop-controls-test-main.cjs")],
    env,
  });
  const restarted = await application.firstWindow();
  await expect(restarted.getByRole("button", { name: "应用菜单（F10）" })).toBeVisible();
  await expect
    .poll(() => restarted.evaluate(() => window.taskflowDesktop.shortcuts.get()))
    .toMatchObject({ shortcut: "Ctrl+Alt+K", registered: true });
  assert.equal(
    await restarted.evaluate(
      async () => (await window.taskflowDesktop.localTasks.list(await window.taskflowDesktop.workspace.get())).length,
    ),
    2,
  );
  report.checks.push("shortcut choice and local tasks survive restart in the same isolated profile");
  report.passed = true;
} catch (error) {
  report.error = error.stack ?? String(error);
  process.exitCode = 1;
} finally {
  await probe?.close().catch(() => undefined);
  await application?.close().catch(() => undefined);
  await writeFile(path.join(root, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
