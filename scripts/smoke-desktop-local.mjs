import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { chromium, expect } from "@playwright/test";

const executable = path.resolve(
  process.argv.find((arg, index) => index > 1 && !arg.startsWith("--")) ?? "dist/electron/win-unpacked/TaskFlow.exe",
);
const profile = path.resolve(`dist/electron/local-smoke-${Date.now()}`);
await mkdir(profile, { recursive: true });
const title = "无需登录的离线验收任务";

async function launch() {
  const child = spawn(executable, [`--user-data-dir=${profile}`, "--remote-debugging-port=9246"], {
    windowsHide: true,
    stdio: ["ignore", "ignore", "pipe"],
    env: { ...process.env, TASKFLOW_WEB_URL: "app://taskflow/tasks/", ELECTRON_START_URL: "app://taskflow/tasks/" },
  });
  child.stderr.on("data", (data) => process.stderr.write(data));
  let browser;
  try {
    for (let attempt = 0; attempt < 40; attempt++) {
      try {
        browser = await chromium.connectOverCDP("http://127.0.0.1:9246");
        break;
      } catch {
        await delay(250);
      }
    }
    if (!browser) throw new Error("无法连接桌面程序。");
    const context = browser.contexts()[0];
    for (let attempt = 0; attempt < 120 && !context.pages().length; attempt++) await delay(250);
    const page = context.pages()[0];
    if (!page) throw new Error("数据库初始化后未打开窗口。");
    await page.waitForLoadState("load");
    await context.setOffline(true);
    let apiRequests = 0;
    page.on("request", (request) => {
      if (request.url().startsWith("https://www.uta4k.top/api/")) apiRequests++;
    });
    await page.goto("app://taskflow/tasks/?status=all", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("本地工作区", { exact: true }).first()).toBeVisible();
    return {
      page,
      apiRequests: () => apiRequests,
      close: async (force = false) => {
        if (force) child.kill();
        else {
          const cdp = await browser.newBrowserCDPSession();
          void cdp.send("Browser.close").catch(() => undefined);
        }
        for (let attempt = 0; attempt < 40 && child.exitCode === null && child.signalCode === null; attempt++)
          await delay(250);
        if (child.exitCode === null && child.signalCode === null) {
          child.kill();
          throw new Error("桌面程序没有正常退出。");
        }
        await Promise.race([browser.close().catch(() => undefined), delay(1000)]);
      },
    };
  } catch (error) {
    await browser?.close();
    child.kill();
    throw error;
  }
}

let app = await launch();
let task;
try {
  task = await app.page.evaluate(async (title) => {
    const bridge = window.taskflowDesktop;
    const workspace = await bridge.workspace.get();
    if (workspace.syncEnabled || (await bridge.auth.get())) throw new Error("验收配置必须未登录且未启用同步。");
    const created = await bridge.localTasks.create({
      accountId: workspace.accountId,
      task: { title, description: "离线创建", status: "todo", priority: "medium", tags: "验收", dueDate: "2026-11-04" },
    });
    await bridge.localTasks.update({
      accountId: workspace.accountId,
      taskId: created.id,
      task: { ...created, description: "离线编辑", tags: "验收" },
    });
    await bridge.localTasks.updateStatus({ accountId: workspace.accountId, taskId: created.id, status: "done" });
    if ((await bridge.syncQueue.list({ accountId: workspace.accountId })).length)
      throw new Error("本地任务不应进入上传队列。");
    return created;
  }, title);
  await app.page.reload();
  await expect(app.page.getByRole("heading", { name: title, exact: true }).first()).toBeVisible();
  if (app.apiRequests()) throw new Error("未登录本地模式不应请求云端 API。");
} finally {
  await app.close(process.argv.includes("--force-exit"));
}

app = await launch();
try {
  await expect(app.page.getByRole("heading", { name: title, exact: true }).first()).toBeVisible();
  const restored = await app.page.evaluate(async (id) => {
    const bridge = window.taskflowDesktop;
    const { accountId } = await bridge.workspace.get();
    return bridge.localTasks.get({ accountId, taskId: id });
  }, task.id);
  if (restored.status !== "done" || restored.description !== "离线编辑") throw new Error("重启后任务内容未恢复。");
  for (const route of ["dashboard", "calendar", "stats", "settings", `tasks/${task.id}`]) {
    await app.page.goto(`app://taskflow/${route}/`, { waitUntil: "domcontentloaded" });
    await expect(app.page.locator("body")).not.toBeEmpty();
  }
  await app.page.evaluate(async (id) => {
    const bridge = window.taskflowDesktop;
    const { accountId } = await bridge.workspace.get();
    await bridge.localTasks.delete({ accountId, taskId: id });
    if (await bridge.localTasks.get({ accountId, taskId: id })) throw new Error("任务删除失败。");
  }, task.id);
  if (app.apiRequests()) throw new Error("离线页面请求了云端 API。");
  console.log(`PASS: 无登录离线 CRUD、重启恢复和全部页面加载（支持 --force-exit 异常退出场景）。隔离目录：${profile}`);
} finally {
  await app.close();
}
