import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { chromium, request, expect as baseExpect } from "@playwright/test";

try {
  process.loadEnvFile(".env.local");
} catch {
  /* Environment variables may be supplied directly. */
}
const email = process.env.TASKFLOW_E2E_EMAIL;
const password = process.env.TASKFLOW_E2E_PASSWORD;
assert.ok(email && password, "请在本机配置专用账户 TASKFLOW_E2E_EMAIL 和 TASKFLOW_E2E_PASSWORD");
const executable = path.resolve(process.argv[2] ?? "dist/electron/win-unpacked/TaskFlow.exe");
const origin = process.env.TASKFLOW_E2E_API_BASE_URL ?? "https://www.uta4k.top";
assert.ok(["https://www.uta4k.top", "http://127.0.0.1:3000"].includes(origin), "仅允许生产服务或本机候选 API");
const root = path.resolve(`dist/electron/cloud-smoke-${Date.now()}`);
const profile = path.join(root, "profile");
const marker = `Desktop E2E ${Date.now()}`;
await mkdir(root, { recursive: true });
const expect = baseExpect.configure({ timeout: 60_000 });
const report = { startedAt: new Date().toISOString(), origin, steps: [], passed: false, cleanup: {} };
const owned = new Map();
let app;
let cloud;
let accountId;
const record = (step) => {
  report.steps.push(step);
  console.log(`PASS: ${step}`);
};

async function fetchCleanup(url, options) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fetch(url, { ...options, signal: AbortSignal.timeout(20_000) });
    } catch (error) {
      if (attempt === 4) throw error;
      await delay(500 * (attempt + 1));
    }
  }
}

async function launch(blockNetwork = false) {
  const server = net.createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  const child = spawn(
    executable,
    [
      `--user-data-dir=${profile}`,
      `--remote-debugging-port=${port}`,
      ...(blockNetwork ? ["--proxy-server=http://127.0.0.1:1"] : []),
    ],
    {
      windowsHide: true,
      stdio: "ignore",
      env: {
        ...process.env,
        TASKFLOW_DISABLE_UPDATE_CHECK: "1",
        ELECTRON_START_URL: "app://taskflow/tasks/?status=all",
        TASKFLOW_WEB_URL: "app://taskflow/tasks/?status=all",
      },
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
      if (child.exitCode !== null) throw new Error("打包程序提前退出");
      try {
        browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
        break;
      } catch {
        await delay(250);
      }
    }
    assert.ok(browser, "无法连接打包程序");
    const context = browser.contexts()[0];
    if (blockNetwork) await context.setOffline(true);
    for (let i = 0; i < 160 && !context.pages().length; i++) await delay(250);
    const page = context.pages()[0];
    assert.ok(page, "打包程序未打开窗口");
    await page.waitForLoadState("domcontentloaded");
    await expect.poll(() => page.evaluate(() => window.taskflowDesktop.workspace.get())).toBeTruthy();
    return { child, browser, context, page, blockNetwork };
  } catch (error) {
    child.kill();
    await browser?.close();
    throw error;
  }
}

async function close() {
  if (!app) return;
  const current = app;
  app = null;
  const cdp = await current.browser.newBrowserCDPSession();
  void cdp.send("Browser.close").catch(() => undefined);
  for (let i = 0; i < 40 && current.child.exitCode === null && current.child.signalCode === null; i++) await delay(250);
  if (current.child.exitCode === null && current.child.signalCode === null) {
    current.child.kill();
    throw new Error("桌面程序未正常退出");
  }
  await Promise.race([current.browser.close().catch(() => undefined), delay(1000)]);
}

const bridge = (operation, args) =>
  app.page.evaluate(
    async ({ operation, args }) => {
      const [group, method] = operation.split(".");
      return window.taskflowDesktop[group][method](args);
    },
    { operation, args },
  );
const queue = () => bridge("syncQueue.list", { accountId });
const local = (id) => bridge("localTasks.get", { accountId, taskId: id });
const replay = () => app.page.evaluate(() => window.dispatchEvent(new Event("online")));
async function desktopApi(endpoint, method = "GET", body) {
  return app.page.evaluate(
    async ({ url, method, body }) => {
      const response = await fetch(url, {
        method,
        credentials: "include",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(20_000),
      });
      return { status: response.status, payload: await response.json().catch(() => null) };
    },
    { url: `${origin}${endpoint}`, method, body },
  );
}
async function cloudTask(id) {
  const response = await cloud.get(`/api/tasks/${encodeURIComponent(id)}`);
  if (response.status() === 404) return null;
  assert.equal(response.status(), 200, "独立会话读取验收任务失败");
  return (await response.json()).task;
}
const form = {
  title: `${marker} local`,
  description: "真实云同步验收",
  status: "todo",
  priority: "medium",
  tags: "desktop-e2e",
  dueDate: "",
};

try {
  // Separate cookie jar acts as another device; credentials are never logged.
  cloud = await request.newContext({ baseURL: origin, timeout: 30_000 });
  let login;
  for (let attempt = 0; attempt < 4; attempt++) {
    login = await cloud.post("/api/auth/login", { data: { email, password }, maxRetries: 2 });
    if (login.ok() || !/fetch failed|ECONNRESET|timeout/i.test((await login.json().catch(() => null))?.message ?? ""))
      break;
    await delay(1000);
  }
  if (!login.ok()) {
    const reason = (await login.json().catch(() => null))?.message ?? "无错误详情";
    throw new Error(`测试会话登录失败：HTTP ${login.status()}，${reason}`);
  }
  assert.equal(login.status(), 200, `独立测试会话登录失败（HTTP ${login.status()}），请检查专用账户和线上服务`);
  accountId = (await login.json()).user.id;
  record("独立真实会话登录成功");
  app = await launch();
  const task = await bridge("localTasks.create", { accountId: "local:device", task: form });
  owned.set(task.id, task.title);
  await app.page.goto("app://taskflow/login/?next=%2Fsettings");
  await app.page.getByRole("textbox", { name: "邮箱", exact: true }).fill(email);
  await app.page.getByRole("textbox", { name: "密码", exact: true }).fill(password);
  await app.page.getByRole("button", { name: "登录", exact: true }).click();
  await expect.poll(async () => (await bridge("auth.get"))?.user?.id).toBe(accountId);
  const me = await desktopApi("/api/auth/me");
  assert.equal(me.status, 200, "app:// 页面跨域 Cookie 会话不可读");
  assert.equal(me.payload.user.id, accountId);
  assert.equal(await cloudTask(task.id), null, "登录不能自动上传本地任务");
  record("打包登录表单、app:// 跨域 Cookie 会话和登录不上传");
  await app.page.goto("app://taskflow/settings/");
  await app.page.getByRole("button", { name: "开启云同步", exact: true }).click();
  await expect.poll(async () => (await queue()).length).toBe(0);
  await expect.poll(async () => (await cloudTask(task.id))?.title).toBe(task.title);
  record("主动开启同步上传真实任务并确认队列");

  await app.context.setOffline(true);
  await bridge("localTasks.updateStatus", { accountId, taskId: task.id, status: "done" });
  const pending = (await queue())[0];
  assert.ok(pending, "离线修改未加入队列");
  await replay();
  assert.equal((await cloudTask(task.id)).status, "todo");
  await close();
  app = await launch(true);
  assert.equal((await bridge("auth.get")).user.id, accountId, "离线重启未恢复加密身份");
  assert.equal((await local(task.id)).status, "done");
  assert.ok((await queue()).some((op) => op.operationId === pending.operationId));
  await close();
  app = await launch();
  await expect.poll(async () => (await queue()).length).toBe(0);
  await expect.poll(async () => (await cloudTask(task.id))?.status).toBe("done");
  assert.equal((await desktopApi("/api/auth/me")).status, 200, "联网重启后 Cookie 会话未持久化");
  record("断网修改、离线冷启动恢复身份和队列、联网重启自动回放及真实会话持久化");
  const duplicate = await desktopApi("/api/tasks/sync", "POST", { operations: [pending] });
  assert.equal(duplicate.status, 200);
  assert.ok(["applied", "stale"].includes(duplicate.payload?.results?.[0]?.status));
  const listed = await cloud.get("/api/tasks?export=1");
  assert.equal(listed.status(), 200);
  assert.equal((await listed.json()).tasks.filter((item) => item.id === task.id).length, 1);
  record("真实接口重复回放不产生重复任务");

  const created = await cloud.post("/api/tasks", { data: { ...form, title: `${marker} remote` } });
  assert.equal(created.status(), 201);
  const remote = (await created.json()).task;
  owned.set(remote.id, remote.title);
  await replay();
  await expect.poll(async () => (await local(remote.id))?.title).toBe(remote.title);
  record("另一独立会话创建的云端任务下载到桌面");

  const bulkCount = Number(process.env.TASKFLOW_E2E_BULK_COUNT ?? 0);
  assert.ok(Number.isInteger(bulkCount) && bulkCount >= 0 && bulkCount <= 110, "批量验收数量应为 0 到 110");
  if (bulkCount) {
    const bulkIds = [];
    for (let start = 0; start < bulkCount; start += 3) {
      await Promise.all(
        Array.from({ length: Math.min(3, bulkCount - start) }, async (_, offset) => {
          const title = `${marker} bulk ${start + offset}`;
          const response = await cloud.post("/api/tasks", { data: { ...form, title } });
          assert.equal(response.status(), 201, "批量验收创建任务失败");
          const item = (await response.json()).task;
          owned.set(item.id, title);
          bulkIds.push(item.id);
        }),
      );
    }
    const exported = await cloud.get("/api/tasks?export=1");
    assert.equal(exported.status(), 200);
    const ids = new Set((await exported.json()).tasks.map((item) => item.id));
    assert.ok(
      bulkIds.every((id) => ids.has(id)),
      "普通列表/导出遗漏后续页",
    );
    await replay();
    await expect
      .poll(async () => {
        const localIds = new Set((await bridge("localTasks.list", { accountId })).map((item) => item.id));
        return bulkIds.every((id) => localIds.has(id));
      })
      .toBe(true);
    record(`真实批量 ${bulkCount} 条任务的列表导出及桌面分页下载完整`);
  }

  await app.context.setOffline(true);
  await bridge("localTasks.update", { accountId, taskId: task.id, task: { ...form, description: "较早的离线编辑" } });
  await delay(100);
  const changed = await cloud.patch(`/api/tasks/${task.id}`, { data: { ...form, description: "较新的远程编辑" } });
  assert.equal(changed.status(), 200);
  await app.context.setOffline(false);
  await replay();
  await expect.poll(async () => (await queue()).length).toBe(0);
  await expect.poll(async () => (await local(task.id))?.description).toBe("较新的远程编辑");
  assert.equal((await cloudTask(task.id)).description, "较新的远程编辑");
  record("多会话修改冲突：较新的远程修改覆盖较早离线修改");

  await app.page.goto("app://taskflow/settings/");
  await app.page.getByRole("button", { name: "暂停云同步", exact: true }).click();
  await expect.poll(() => bridge("workspace.get")).toMatchObject({ syncEnabled: false });
  await bridge("localTasks.update", {
    accountId,
    taskId: task.id,
    task: { ...form, description: "恢复同步后的本地新编辑" },
  });
  await replay();
  await delay(1000);
  assert.equal((await cloudTask(task.id)).description, "较新的远程编辑");
  assert.ok((await queue()).length);
  await app.page.getByRole("button", { name: "开启云同步", exact: true }).click();
  await expect.poll(async () => (await queue()).length).toBe(0);
  await expect.poll(async () => (await cloudTask(task.id))?.description).toBe("恢复同步后的本地新编辑");
  record("暂停仍可编辑、恢复后本地较新修改上传");
  await bridge("localTasks.delete", { accountId, taskId: task.id });
  await replay();
  await expect.poll(async () => (await queue()).length).toBe(0);
  await expect.poll(() => cloudTask(task.id)).toBeNull();
  record("桌面删除同步到真实云端");

  const forbidden = await desktopApi("/api/tasks/sync", "POST", {
    operations: [{ ...pending, accountId: "wrong-account-e2e" }],
  });
  assert.equal(forbidden.status, 403);
  record("同步接口拒绝账户不匹配的操作");
  await app.page.getByRole("button", { name: "打开账号菜单", exact: true }).click();
  await app.page.getByRole("menuitem", { name: "退出登录", exact: true }).click();
  await expect.poll(() => bridge("auth.get")).toBeNull();
  assert.ok(await local(remote.id), "退出登录不应删除本地任务");
  await expect.poll(async () => (await desktopApi("/api/auth/me")).status).toBe(401);
  record("退出登录保留本地任务并失效真实云会话");

  await app.page.goto("app://taskflow/login/?next=%2Fsettings");
  await app.page.getByRole("textbox", { name: "邮箱", exact: true }).fill(email);
  await app.page.getByRole("textbox", { name: "密码", exact: true }).fill(password);
  await app.page.getByRole("button", { name: "登录", exact: true }).click();
  await expect.poll(async () => (await bridge("auth.get"))?.user?.id).toBe(accountId);
  await app.page.goto("app://taskflow/settings/");
  await app.page.getByRole("button", { name: "开启云同步", exact: true }).click();
  await expect.poll(() => bridge("workspace.get")).toMatchObject({ syncEnabled: true });
  assert.ok(await local(remote.id));
  record("重新登录并主动恢复原账户同步");
  await app.context.setOffline(true);
  const olderEdit = await bridge("localTasks.update", {
    accountId,
    taskId: remote.id,
    task: { ...form, title: remote.title, description: "删除之前的离线编辑" },
  });
  await delay(100);
  const remoteDeleted = await cloud.delete(`/api/tasks/${remote.id}`);
  assert.ok(remoteDeleted.ok());
  assert.equal(await cloudTask(remote.id), null);
  await app.context.setOffline(false);
  await replay();
  // Observe presence as a boolean so failure output never exposes task contents.
  await expect
    .poll(async () => Boolean(await local(remote.id)), { timeout: 40_000, message: "另一设备删除后桌面仍保留任务" })
    .toBe(false);
  record("另一设备删除的云端任务同步移除桌面副本");
  await expect.poll(async () => (await queue()).length).toBe(0);
  record("较新的删除记录胜过较早的离线编辑，不复活任务");
  await delay(100);
  const restored = await cloud.post("/api/tasks/sync", {
    data: {
      operations: [
        {
          operationId: `restore-${Date.now()}`,
          accountId,
          taskId: remote.id,
          operation: "upsert",
          clientUpdatedAt: new Date().toISOString(),
          payload: { ...remote, description: "删除之后的新编辑" },
        },
      ],
    },
  });
  assert.equal(restored.status(), 200);
  assert.equal((await restored.json()).results[0].status, "applied");
  await replay();
  await expect.poll(async () => (await local(remote.id))?.description).toBe("删除之后的新编辑");
  const oldDelete = await desktopApi("/api/tasks/sync", "POST", {
    operations: [
      {
        operationId: `old-delete-${Date.now()}`,
        accountId,
        taskId: remote.id,
        operation: "delete",
        clientUpdatedAt: olderEdit.updatedAt,
        payload: { id: remote.id },
      },
    ],
  });
  assert.equal(oldDelete.payload?.results?.[0]?.status, "stale");
  assert.ok(await cloudTask(remote.id));
  record("较新的编辑可恢复删除任务，旧删除回放不会移除新版本");
  report.passed = true;
} catch (error) {
  // Only record the assertion message, never an auth response, cookies or credentials.
  report.error = String(error.message).replaceAll(email, "[redacted]").replaceAll(password, "[redacted]");
  console.error(`FAIL: ${report.error}`);
  process.exitCode = 1;
} finally {
  if (app) {
    await bridge("workspace.pause").catch(() => undefined);
    await app.context.setOffline(false).catch(() => undefined);
    if (!app.blockNetwork) await desktopApi("/api/auth/logout", "POST").catch(() => undefined);
    await bridge("auth.clear").catch(() => undefined);
  }
  const remaining = [];
  report.ownedTasks = [...owned].map(([id, title]) => ({ id, title }));
  const purge = process.env.TASKFLOW_E2E_PURGE === "1";
  if (cloud) {
    for (const [id, title] of owned) {
      try {
        if (purge) {
          const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT?.replace(/\/$/, "");
          const project = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
          const session = (await cloud.storageState()).cookies.find(
            (cookie) => cookie.name === (process.env.APPWRITE_SESSION_COOKIE_NAME || "taskflow-session"),
          )?.value;
          const db = process.env.APPWRITE_DATABASE_ID;
          const table = process.env.APPWRITE_TASKS_TABLE_ID;
          assert.ok(endpoint && project && session && db && table, "物理清理需要本机 Appwrite 配置与测试会话");
          const url = `${endpoint}/tablesdb/${encodeURIComponent(db)}/tables/${encodeURIComponent(table)}/rows/${encodeURIComponent(id)}`;
          const headers = {
            "X-Appwrite-Project": project,
            "X-Appwrite-Session": session,
            "X-Appwrite-Response-Format": "1.8.0",
          };
          const row = await fetchCleanup(url, { headers });
          if (row.status === 404) continue;
          assert.ok(row.ok, `读取测试行 HTTP ${row.status}`);
          const payload = await row.json();
          assert.equal(payload.$id, id);
          assert.equal(payload.title, title, "只能物理清理本轮创建的任务");
          assert.ok(title.startsWith(marker));
          assert.ok((await fetchCleanup(url, { method: "DELETE", headers })).ok);
          assert.equal((await fetchCleanup(url, { headers })).status, 404);
          continue;
        }
        const task = await cloudTask(id);
        if (!task) continue;
        assert.equal(task.title, title, "清理目标必须是本次专用验收任务");
        const removed = await cloud.delete(`/api/tasks/${encodeURIComponent(id)}`);
        assert.ok(removed.ok());
        assert.equal(await cloudTask(id), null);
      } catch {
        remaining.push(id);
      }
    }
    await cloud.post("/api/auth/logout").catch(() => undefined);
    await cloud.dispose();
  }
  report.cleanup.remainingTaskIds = remaining;
  report.cleanup.mode = purge ? "purge-owned-test-rows" : "delete-active-test-tasks";
  if (remaining.length) {
    report.passed = false;
    process.exitCode = 1;
  }
  await close().catch(() => {
    report.passed = false;
    process.exitCode = 1;
  });
  report.finishedAt = new Date().toISOString();
  await writeFile(path.join(root, "report.json"), JSON.stringify(report, null, 2));
  console.log(`真实云验收报告：${path.join(root, "report.json")}`);
  console.log(`本次验收任务清理：${remaining.length ? "有待清理任务，见报告" : "已完成"}`);
}
