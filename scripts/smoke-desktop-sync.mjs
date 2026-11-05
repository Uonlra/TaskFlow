import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { chromium, expect as baseExpect } from "@playwright/test";

// Exercises the packaged renderer, IPC, encrypted DB and production replay code.
// Only the cloud is simulated. No real credentials or production writes are used.
const executable = path.resolve(process.argv[2] ?? "dist/electron/win-unpacked/TaskFlow.exe");
const profile = path.resolve(`dist/electron/sync-smoke-${Date.now()}`);
await mkdir(profile, { recursive: true });
const expect = baseExpect.configure({ timeout: 15_000 });
const clouds = new Map();
let signedIn = null;
let offline = false;
let failSync = false;
let syncRequests = 0;
const unexpected = [];
const account = (id) => ({
  user: { id, email: `${id}@example.invalid`, name: id, emailVerified: true },
  profile: { id, email: `${id}@example.invalid`, fullName: id },
  session: { expire: "2099-01-01T00:00:00.000Z" },
});
const cloud = () => {
  if (!clouds.has(signedIn)) clouds.set(signedIn, new Map());
  return clouds.get(signedIn);
};

async function mockCloud(route) {
  const request = route.request();
  const url = new URL(request.url());
  if (offline) return route.abort("internetdisconnected");
  const reply = (body, status = 200) => route.fulfill({ status, json: body });
  if (!["https://www.uta4k.top", "http://127.0.0.1:3000"].includes(url.origin)) {
    unexpected.push(url.origin);
    return route.abort();
  }
  if (url.pathname === "/api/auth/lookup") return reply({ status: "existing" });
  if (url.pathname === "/api/auth/login") {
    signedIn = request.postDataJSON().email.split("@")[0];
    return reply(account(signedIn));
  }
  if (url.pathname === "/api/auth/me") return reply(signedIn ? account(signedIn) : {}, signedIn ? 200 : 401);
  if (url.pathname === "/api/auth/logout") {
    signedIn = null;
    return reply({});
  }
  if (url.pathname === "/api/tasks/sync") {
    if (request.method() === "GET") return reply({ tasks: [...cloud().values()], nextCursor: null });
    syncRequests++;
    if (failSync) return reply({ message: "模拟服务暂不可用" }, 503);
    if (!signedIn) return reply({}, 401);
    const results = request.postDataJSON().operations.map((operation) => {
      assert.equal(operation.accountId, signedIn, "不应发送其他账户的队列");
      if (operation.operation === "delete") {
        const timestamp = operation.clientUpdatedAt;
        const task = {
          ...cloud().get(operation.taskId),
          deletedAt: timestamp,
          updatedAt: timestamp,
          syncClientUpdatedAt: timestamp,
        };
        cloud().set(operation.taskId, task);
        return { operationId: operation.operationId, taskId: operation.taskId, status: "deleted", task };
      }
      const task = { ...operation.payload, updatedAt: operation.clientUpdatedAt };
      cloud().set(task.id, task);
      return { operationId: operation.operationId, taskId: task.id, status: "applied", task };
    });
    return reply({ results });
  }
  if (url.pathname === "/api/tasks") return reply({ tasks: [...cloud().values()].filter((task) => !task.deletedAt) });
  unexpected.push(`${request.method()} ${url.pathname}`);
  return route.abort();
}

async function launch() {
  const server = net.createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  const child = spawn(
    executable,
    [
      `--user-data-dir=${profile}`,
      `--remote-debugging-port=${port}`,
      // Fail closed even before Playwright installs interception on a new process.
      "--proxy-server=http://127.0.0.1:1",
      "--proxy-bypass-list=127.0.0.1;localhost",
    ],
    {
      windowsHide: true,
      stdio: "ignore",
      env: { ...process.env, ELECTRON_START_URL: "app://taskflow/tasks/", TASKFLOW_WEB_URL: "app://taskflow/tasks/" },
    },
  );
  let spawnError;
  child.on("error", (error) => {
    spawnError = error;
  });
  let browser;
  try {
    for (let i = 0; i < 160; i++) {
      if (spawnError) throw spawnError;
      if (child.exitCode !== null) throw new Error(`桌面进程提前退出：${child.exitCode}`);
      try {
        browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
        break;
      } catch {
        await delay(250);
      }
    }
    assert.ok(browser, "无法连接桌面进程");
    const context = browser.contexts()[0];
    await context.route(/^https?:\/\//, mockCloud);
    for (let i = 0; i < 160 && !context.pages().length; i++) await delay(250);
    const page = context.pages()[0];
    assert.ok(page, "桌面窗口未打开");
    await page.waitForLoadState("domcontentloaded");
    return { child, browser, context, page };
  } catch (error) {
    child.kill();
    await browser?.close();
    throw error;
  }
}

async function close(app) {
  if (!app) return;
  const cdp = await app.browser.newBrowserCDPSession();
  void cdp.send("Browser.close").catch(() => undefined);
  for (let i = 0; i < 40 && app.child.exitCode === null && app.child.signalCode === null; i++) await delay(250);
  if (app.child.exitCode === null && app.child.signalCode === null) {
    app.child.kill();
    throw new Error("桌面进程未正常退出");
  }
  await Promise.race([app.browser.close().catch(() => undefined), delay(1000)]);
}

let app;
const bridge = (operation, args) =>
  app.page.evaluate(
    async ({ operation, args }) => {
      const [group, method] = operation.split(".");
      return window.taskflowDesktop[group][method](args);
    },
    { operation, args },
  );
const queue = (id) => bridge("syncQueue.list", { accountId: id });
const replay = () => app.page.evaluate(() => window.dispatchEvent(new Event("online")));
async function login(id) {
  await app.page.goto("app://taskflow/login/?next=%2Fsettings");
  await app.page.getByRole("textbox", { name: "邮箱", exact: true }).fill(`${id}@example.invalid`);
  await app.page.getByRole("textbox", { name: "密码", exact: true }).fill("Smoke-test-123!");
  await app.page.getByRole("button", { name: "登录", exact: true }).click();
  await expect.poll(async () => (await bridge("auth.get"))?.user?.id).toBe(id);
  // The desktop auth layout currently redirects authenticated users to the overview.
  await app.page.goto("app://taskflow/settings/");
  await expect(app.page.getByRole("button", { name: /开启同步|开启云同步/ })).toBeVisible();
}

try {
  app = await launch();
  await expect.poll(() => bridge("workspace.get")).toEqual({ accountId: "local:device", syncEnabled: false });
  const task = await bridge("localTasks.create", {
    accountId: "local:device",
    task: {
      title: "同步验收专用任务",
      description: "本地创建",
      status: "todo",
      priority: "medium",
      tags: "验收",
      dueDate: "",
    },
  });
  await login("smoke-a");
  assert.equal(syncRequests, 0, "登录本身不能触发上传");
  assert.equal((await queue("local:device")).length, 0);
  await app.page.getByRole("button", { name: "开启云同步", exact: true }).click();
  await expect.poll(() => cloud().has(task.id)).toBe(true);
  await expect.poll(async () => (await queue("smoke-a")).length).toBe(0);

  failSync = true;
  await bridge("localTasks.updateStatus", { accountId: "smoke-a", taskId: task.id, status: "done" });
  await replay();
  await expect.poll(async () => (await queue("smoke-a"))[0]?.attempts ?? 0).toBeGreaterThan(0);
  assert.equal(cloud().get(task.id).status, "todo", "失败不能悄悄修改云端");
  const pending = (await queue("smoke-a"))[0].operationId;
  await close(app);
  app = null;
  offline = true;
  app = await launch();
  await expect.poll(async () => (await queue("smoke-a"))[0]?.operationId).toBe(pending);
  assert.equal((await bridge("auth.get")).user.id, "smoke-a", "离线重启应恢复加密会话");
  assert.equal((await bridge("localTasks.get", { accountId: "smoke-a", taskId: task.id })).status, "done");
  offline = false;
  failSync = false;
  await replay();
  await expect.poll(async () => (await queue("smoke-a")).length).toBe(0);
  assert.equal(cloud().get(task.id).status, "done");

  // Verify pull through the actual repository instead of inserting into SQLite.
  const remote = { ...task, id: "remote-only-smoke", title: "云端下载验收任务" };
  cloud().set(remote.id, remote);
  await replay();
  await expect
    .poll(() => bridge("localTasks.get", { accountId: "smoke-a", taskId: remote.id }))
    .toMatchObject({ title: remote.title });
  await app.page.goto("app://taskflow/settings/");
  await app.page.getByRole("button", { name: "暂停云同步", exact: true }).click();
  await expect.poll(() => bridge("workspace.get")).toMatchObject({ syncEnabled: false });
  await bridge("localTasks.updateStatus", { accountId: "smoke-a", taskId: task.id, status: "todo" });
  const before = syncRequests;
  await replay();
  await delay(1000);
  assert.equal(syncRequests, before, "暂停时不应回放队列");
  assert.equal((await queue("smoke-a")).length, 1);
  await app.page.getByRole("button", { name: "开启云同步", exact: true }).click();
  await expect.poll(async () => (await queue("smoke-a")).length).toBe(0);

  await bridge("localTasks.delete", { accountId: "smoke-a", taskId: task.id });
  await replay();
  await expect.poll(() => Boolean(cloud().get(task.id)?.deletedAt)).toBe(true);
  await expect.poll(async () => (await queue("smoke-a")).length).toBe(0);
  await app.page.getByRole("button", { name: "打开账号菜单", exact: true }).click();
  await app.page.getByRole("menuitem", { name: "退出登录", exact: true }).click();
  await expect.poll(() => bridge("auth.get")).toBeNull();
  assert.ok(await bridge("localTasks.get", { accountId: "smoke-a", taskId: remote.id }), "退出应保留本地任务");
  await login("smoke-b");
  await app.page.getByRole("button", { name: "切换到当前账户并开启同步", exact: true }).click();
  await expect.poll(() => bridge("workspace.get")).toEqual({ accountId: "smoke-b", syncEnabled: true });
  assert.deepEqual(await bridge("localTasks.list", { accountId: "smoke-b" }), []);
  assert.equal(cloud().size, 0, "不能向新账户上传原账户任务");
  await app.page.getByRole("button", { name: "打开账号菜单", exact: true }).click();
  await app.page.getByRole("menuitem", { name: "退出登录", exact: true }).click();
  await expect.poll(() => bridge("auth.get")).toBeNull();
  await login("smoke-a");
  await app.page.getByRole("button", { name: "切换到当前账户并开启同步", exact: true }).click();
  await expect.poll(() => bridge("workspace.get")).toEqual({ accountId: "smoke-a", syncEnabled: true });
  assert.ok(await bridge("localTasks.get", { accountId: "smoke-a", taskId: remote.id }), "连接原账户应恢复原工作区");
  assert.deepEqual(unexpected, [], "出现未模拟的网络请求");
  console.log(
    `PASS: 打包程序登录不上传、开启同步、失败重试、离线重启恢复会话和队列、下载、暂停/恢复、删除、退出保留和账户隔离。模拟云接口；隔离目录：${profile}`,
  );
} finally {
  await close(app);
}
