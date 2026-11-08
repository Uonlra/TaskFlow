import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { _electron, expect as baseExpect } from "@playwright/test";

assert.equal(process.platform, "win32");
const expect = baseExpect.configure({ timeout: 30_000 });
const root = path.resolve(`dist/tray-smoke-${Date.now()}`);
const profile = path.join(root, "profile");
await mkdir(profile, { recursive: true });
const report = { passed: false, root, checks: [] };
let application;
try {
  application = await _electron.launch({
    executablePath: process.env.TASKFLOW_TRAY_ELECTRON_EXE,
    args: [path.resolve("scripts/fixtures/tray-test-main.cjs")],
    env: { ...process.env, TASKFLOW_TRAY_TEST_PROFILE: profile },
  });
  const page = await application.firstWindow();
  await expect(page.getByRole("heading", { name: "TaskFlow tray smoke" })).toBeVisible();
  assert.equal(await application.evaluate(({ app }) => app.getPath("userData")), profile);
  assert.equal(await application.evaluate(() => globalThis.taskflowTraySmoke.tray.isDestroyed()), false);
  report.checks.push("native Windows Tray loads the multi-resolution ICO in an isolated profile");
  await application.evaluate(() => globalThis.taskflowTraySmoke.menu.getMenuItemById("hide").click());
  await expect.poll(() => application.evaluate(() => globalThis.taskflowTraySmoke.window.isVisible())).toBe(false);
  await application.evaluate(() => globalThis.taskflowTraySmoke.menu.getMenuItemById("show").click());
  await expect.poll(() => application.evaluate(() => globalThis.taskflowTraySmoke.window.isVisible())).toBe(true);
  report.checks.push("native context menu callbacks hide and restore the window");
  await application.evaluate(() => globalThis.taskflowTraySmoke.window.minimize());
  await expect.poll(() => application.evaluate(() => globalThis.taskflowTraySmoke.window.isMinimized())).toBe(true);
  await application.evaluate(() => globalThis.taskflowTraySmoke.tray.emit("click"));
  await expect.poll(() => application.evaluate(() => globalThis.taskflowTraySmoke.window.isMinimized())).toBe(false);
  report.checks.push("tray activation restores a minimized window");
  await application.evaluate(() => globalThis.taskflowTraySmoke.menu.getMenuItemById("hide").click());
  const closed = application.waitForEvent("close");
  await application
    .evaluate(() => globalThis.taskflowTraySmoke.menu.getMenuItemById("quit").click())
    .catch(() => undefined);
  await closed;
  application = null;
  report.checks.push("explicit tray quit closes the application even while its window is hidden");
  report.passed = true;
} catch (error) {
  report.error = error.stack ?? String(error);
  process.exitCode = 1;
} finally {
  await application?.close().catch(() => undefined);
  await writeFile(path.join(root, "report.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));
}
