import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import net from "node:net";
import { createRequire } from "node:module";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { chromium, request, expect as baseExpect } from "@playwright/test";
import { build } from "esbuild";
import { measureEvolutionBrowser } from "./lib/measure-evolution-browser.mjs";

try {
  process.loadEnvFile(".env.local");
} catch {
  /* Environment may be supplied directly. */
}
const email = process.env.TASKFLOW_E2E_EMAIL;
const password = process.env.TASKFLOW_E2E_PASSWORD;
assert.ok(email && password, "请配置专用验收账户 TASKFLOW_E2E_EMAIL 和 TASKFLOW_E2E_PASSWORD");
const executable = createRequire(import.meta.url)("electron");
// Exercises this checkout against real Appwrite without deploying the candidate API.
const origin = "http://127.0.0.1:3000";
const root = path.resolve(`test-results/evolution-cloud-${Date.now()}`);
const profile = path.join(root, "desktop-profile");
const marker = `Evolution E2E ${Date.now()}`;
const expect = baseExpect.configure({ timeout: 60_000 });
const report = { startedAt: new Date().toISOString(), origin, steps: [], passed: false, cleanup: {} };
const owned = new Set();
const clients = [];
let app;
let web;
let accountId;
await mkdir(root, { recursive: true });
const record = (step) => {
  report.steps.push(step);
  console.log(`PASS: ${step}`);
};
const command = (task, action) => ({
  operationId: randomUUID(),
  expectedRevision: task.evolution?.revision ?? 0,
  action,
});
async function api(client, url, method = "GET", data, status = 200) {
  const response = await client.fetch(url, { method, ...(data ? { data } : {}) });
  assert.equal(response.status(), status, `${method} ${url} 应返回 ${status}，实际 ${response.status()}`);
  return response.json();
}
const getTask = async (id) => (await api(web, `/api/tasks/${id}`)).task;
async function evolve(client, task, action) {
  return (await api(client, `/api/tasks/${task.id}/evolution`, "POST", command(task, action))).task;
}
async function launch(offline = false) {
  const server = net.createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  const child = spawn(
    executable,
    [
      path.resolve("electron/main.cjs"),
      `--user-data-dir=${profile}`,
      `--remote-debugging-port=${port}`,
      ...(offline ? ["--proxy-server=http://127.0.0.1:1"] : []),
    ],
    {
      windowsHide: true,
      stdio: "ignore",
      env: { ...process.env, TASKFLOW_DISABLE_UPDATE_CHECK: "1", ELECTRON_START_URL: "app://taskflow/tasks/" },
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
      if (child.exitCode !== null) throw new Error("桌面验收进程提前退出");
      try {
        browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
        break;
      } catch {
        await delay(250);
      }
    }
    assert.ok(browser, "无法连接当前源码的桌面进程");
    const context = browser.contexts()[0];
    if (offline) await context.setOffline(true);
    for (let i = 0; i < 160 && !context.pages().length; i++) await delay(250);
    const page = context.pages()[0];
    assert.ok(page, "桌面窗口未打开");
    await page.waitForLoadState("domcontentloaded");
    await expect.poll(() => page.evaluate(() => window.taskflowDesktop.workspace.get())).toBeTruthy();
    return { child, browser, context, page, offline };
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
    throw new Error("桌面验收进程未正常退出");
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
const local = (taskId) => bridge("localTasks.get", { accountId, taskId });
const queue = () => bridge("syncQueue.list", { accountId });
const replay = () => app.page.getByRole("button", { name: "立即同步", exact: true }).first().click();

try {
  for (let i = 0; i < 2; i++) {
    const client = await request.newContext({ baseURL: origin, timeout: 60_000 });
    clients.push(client);
    const auth = await api(client, "/api/auth/login", "POST", { email, password });
    assert.ok(auth.user?.id, "专用账户登录失败");
    accountId = auth.user.id;
  }
  web = clients[0];
  const other = clients[1];
  const anonymous = await request.newContext({ baseURL: origin, timeout: 60_000 });
  clients.push(anonymous);
  record("两个独立真实用户会话已建立");
  let source = (
    await api(
      web,
      "/api/tasks",
      "POST",
      {
        title: `${marker} source`,
        description: "任务演进真实云验收",
        status: "in_progress",
        priority: "medium",
        tags: "e2e",
        dueDate: "",
      },
      201,
    )
  ).task;
  owned.add(source.id);
  source = await evolve(web, source, {
    type: "adjust_goal",
    goal: { objective: source.title, successCriteria: "验证原任务" },
    reason: "设定验收标准",
  });
  source = await evolve(web, source, { type: "create_branch", title: "在线探索方案", question: "能否形成独立方向？" });
  const branchId = source.evolution.branches[0].id;
  source = await evolve(web, source, {
    type: "submit_result",
    branchId,
    summary: "形成可采纳成果",
    points: ["保留可追溯来源"],
  });
  const result = source.evolution.results[0];
  source = await evolve(web, source, {
    type: "adopt_result",
    branchId,
    resultId: result.id,
    pointIds: [result.points[0].id],
    reason: "确认成果",
    goal: { objective: source.title, successCriteria: "验证原任务及来源追溯" },
  });
  assert.equal((await getTask(source.id)).evolution.adoptions.length, 1);
  source = await evolve(web, source, { type: "review_branch", branchId, reason: "方向仍适用于当前目标" });
  record("真实云端目标调整、结论、采纳与分支检查持久化");
  const onlineTargetId = randomUUID();
  owned.add(onlineTargetId);
  const onlineTransfer = command(source, {
    type: "transfer_branch",
    branchId,
    targetTaskId: onlineTargetId,
    goal: { objective: `${marker} online target`, successCriteria: "验证独立推进" },
    reason: "独立推进在线方向",
  });
  const transferred = await api(web, `/api/tasks/${source.id}/transfer`, "POST", onlineTransfer);
  assert.equal(transferred.task.id, onlineTargetId);
  source = transferred.source;
  const retried = await api(other, `/api/tasks/${source.id}/transfer`, "POST", onlineTransfer);
  assert.equal(retried.source.evolution.revision, source.evolution.revision);
  assert.equal(retried.task.id, onlineTargetId);
  await api(
    web,
    `/api/tasks/${source.id}/evolution`,
    "POST",
    command(source, { type: "record_progress", branchId, note: "不得修改已转出分支" }),
    400,
  );
  record("真实双任务事务、来源记录、重复重试与转出只读约束");
  const concurrent = [
    command(source, { type: "record_progress", note: "会话一进展" }),
    command(source, { type: "record_progress", note: "会话二进展" }),
  ];
  const concurrentResponses = await Promise.all(
    clients.slice(0, 2).map((client, i) => client.post(`/api/tasks/${source.id}/evolution`, { data: concurrent[i] })),
  );
  assert.deepEqual(concurrentResponses.map((response) => response.status()).sort(), [200, 409]);
  source = await getTask(source.id);
  assert.equal(source.evolution.revision, transferred.source.evolution.revision + 1);
  await api(anonymous, `/api/tasks/${source.id}`, "GET", undefined, 401);
  await api(anonymous, `/api/tasks/${source.id}/transfer`, "POST", onlineTransfer, 401);
  record("真实并发写入只提交一次，匿名会话不能读取或转出");

  app = await launch();
  await app.page.goto("app://taskflow/login/?next=%2Fsettings");
  await app.page.getByRole("textbox", { name: "邮箱", exact: true }).fill(email);
  await app.page.getByRole("textbox", { name: "密码", exact: true }).fill(password);
  await app.page.getByRole("button", { name: "登录", exact: true }).click();
  await expect.poll(async () => (await bridge("auth.get"))?.user?.id).toBe(accountId);
  await app.page.goto("app://taskflow/settings/");
  await app.page.getByRole("button", { name: "连接云端账户", exact: true }).click();
  await replay();
  await expect.poll(async () => Boolean((await local(source.id))?.evolution)).toBe(true);
  await expect.poll(async () => Boolean(await local(onlineTargetId))).toBe(true);
  record("当前桌面源码通过真实登录与同步下载来源和独立任务");
  await app.context.setOffline(true);
  source = await local(source.id);
  source = await bridge("localTasks.executeEvolution", {
    accountId,
    taskId: source.id,
    command: command(source, { type: "create_branch", title: "离线探索方案", question: "断网期间能否独立推进？" }),
  });
  const offlineBranch = source.evolution.branches.at(-1);
  const offlineTargetId = randomUUID();
  owned.add(offlineTargetId);
  const offlineTransfer = command(source, {
    type: "transfer_branch",
    branchId: offlineBranch.id,
    targetTaskId: offlineTargetId,
    goal: { objective: `${marker} offline target`, successCriteria: "保留离线独立进展" },
    reason: "离线转出",
  });
  const offlineResult = await bridge("localTasks.transferBranch", {
    accountId,
    taskId: source.id,
    command: offlineTransfer,
  });
  let child = await bridge("localTasks.executeEvolution", {
    accountId,
    taskId: offlineTargetId,
    command: command(offlineResult.task, { type: "record_progress", note: "离线独立进展" }),
  });
  const pending = await queue();
  assert.ok(pending.findIndex((op) => op.taskId === source.id) < pending.findIndex((op) => op.taskId === child.id));
  assert.equal((await web.get(`/api/tasks/${child.id}`)).status(), 404);
  await close();
  app = await launch(true);
  assert.equal((await local(child.id)).evolution.revision, child.evolution.revision);
  assert.deepEqual(
    (await queue()).map((op) => op.operationId),
    pending.map((op) => op.operationId),
  );
  record("断网转出及子任务独立进展，冷启动后两份任务和队列完整恢复");
  await close();
  app = await launch();
  await expect.poll(async () => (await queue()).length).toBe(0);
  child = await getTask(child.id);
  assert.ok(child.evolution.events.some((event) => event.command?.action.note === "离线独立进展"));
  source = await getTask(source.id);
  assert.equal(source.evolution.events.filter((event) => event.id === offlineTransfer.operationId).length, 1);
  const duplicate = await api(other, "/api/tasks/sync", "POST", { operations: pending });
  assert.ok(duplicate.results.every((item) => ["applied", "stale"].includes(item.status)));
  await api(other, "/api/tasks/sync", "POST", { operations: [{ ...pending[0], accountId: "wrong-e2e-account" }] }, 403);
  record("联网后按来源顺序补传真实云端，重复回放不重复创建，账户不匹配被拒绝");
  child = await evolve(other, child, { type: "record_progress", note: "网页端继续独立推进" });
  await replay();
  await expect.poll(async () => (await local(child.id))?.evolution.revision).toBe(child.evolution.revision);
  await app.page.goto(`app://taskflow/tasks/${child.id}/`);
  await expect(app.page.getByRole("heading", { name: child.title, exact: true })).toBeVisible();
  await expect(app.page.getByRole("link", { name: `${source.title} / 离线探索方案`, exact: true })).toBeVisible();
  await app.page.screenshot({ path: path.join(root, "desktop-independent-task.png") });
  record("网页端新进展下载至桌面，独立详情正确显示来源入口");
  await app.page.getByRole("link", { name: `${source.title} / 离线探索方案`, exact: true }).click();
  await expect(app.page.getByRole("heading", { name: source.title, level: 1, exact: true })).toBeVisible();
  await expect(app.page.getByRole("region", { name: "节点详情", exact: true })).toContainText("转为独立任务");
  await app.page
    .getByRole("region", { name: "节点详情", exact: true })
    .getByRole("link", { name: "打开独立任务 ↗" })
    .click();
  await expect(app.page.getByRole("heading", { name: child.title, level: 1, exact: true })).toBeVisible();
  record("真实桌面来源入口返回原转出节点，目标入口回到对应独立任务");
  // Real divergent histories: preserve the losing device's work through the UI.
  await app.context.setOffline(true);
  let conflictLocal = await local(onlineTargetId);
  conflictLocal = await bridge("localTasks.executeEvolution", {
    accountId,
    taskId: onlineTargetId,
    command: command(conflictLocal, { type: "record_progress", note: "本地冲突进展：保留离线验证" }),
  });
  await evolve(other, await getTask(onlineTargetId), {
    type: "record_progress",
    note: "云端冲突进展：另一设备继续推进",
  });
  const healthy = await local(child.id);
  await bridge("localTasks.executeEvolution", {
    accountId,
    taskId: child.id,
    command: command(healthy, { type: "record_progress", note: "其他任务继续正常同步" }),
  });
  await app.context.setOffline(false);
  await replay();
  await expect.poll(async () => (await bridge("syncQueue.conflicts", { accountId })).length).toBe(1);
  await expect
    .poll(async () =>
      (await getTask(child.id)).evolution.events.some((event) => event.command?.action.note === "其他任务继续正常同步"),
    )
    .toBe(true);
  assert.ok(
    (await local(onlineTargetId)).evolution.events.some((event) =>
      event.command?.action.note?.startsWith("本地冲突进展"),
    ),
  );
  await close();
  app = await launch();
  await expect.poll(async () => (await bridge("syncQueue.conflicts", { accountId })).length).toBe(1);
  await app.page.goto(`app://taskflow/tasks/${onlineTargetId}/`);
  await app.page.getByRole("button", { name: /同步待处理/ }).click();
  const conflictDialog = app.page.getByRole("dialog", { name: "处理同步冲突" });
  await expect(conflictDialog.getByRole("region", { name: "本地版本" })).toContainText("本地冲突进展");
  await expect(conflictDialog.getByRole("region", { name: "云端版本" })).toContainText("云端冲突进展");
  await expect(conflictDialog.getByRole("button", { name: "保留本地副本并恢复同步" })).toBeEnabled();
  await app.page.screenshot({ path: path.join(root, "desktop-sync-conflict.png") });
  await conflictDialog.getByRole("button", { name: "保留本地副本并恢复同步" }).click();
  await expect.poll(async () => (await bridge("syncQueue.conflicts", { accountId })).length).toBe(0);
  const copies = (await bridge("localTasks.list", { accountId })).filter(
    (task) => task.title === conflictLocal.title && task.tags.includes("本地副本"),
  );
  assert.equal(copies.length, 1);
  owned.add(copies[0].id);
  await expect.poll(async () => (await queue()).length).toBe(0);
  await expect
    .poll(async () => Boolean((await getTask(copies[0].id)).evolution.detachedTaskLinksThrough !== undefined))
    .toBe(true);
  assert.ok(
    (await getTask(copies[0].id)).evolution.events.some((event) =>
      event.command?.action.note?.startsWith("本地冲突进展"),
    ),
  );
  await expect(conflictDialog).not.toBeVisible();
  record("真实历史分叉在重启后保留，正常任务继续同步；界面保留本地副本并恢复云端版本");

  await app.context.setOffline(true);
  const secondLocal = await local(onlineTargetId);
  await bridge("localTasks.executeEvolution", {
    accountId,
    taskId: onlineTargetId,
    command: command(secondLocal, { type: "record_progress", note: "本地待放弃修改" }),
  });
  await evolve(other, await getTask(onlineTargetId), { type: "record_progress", note: "确认保留的云端修改" });
  await app.context.setOffline(false);
  await replay();
  await expect.poll(async () => (await bridge("syncQueue.conflicts", { accountId })).length).toBe(1);
  await app.page.getByRole("button", { name: /同步待处理/ }).click();
  await expect(conflictDialog.getByRole("button", { name: "采用云端版本", exact: true })).toBeEnabled();
  await conflictDialog.getByRole("button", { name: "采用云端版本", exact: true }).click();
  assert.ok(
    (await local(onlineTargetId)).evolution.events.some((event) => event.command?.action.note === "本地待放弃修改"),
  );
  await app.page.getByRole("button", { name: "确认采用云端版本", exact: true }).click();
  await expect.poll(async () => (await bridge("syncQueue.conflicts", { accountId })).length).toBe(0);
  assert.ok(
    !(await local(onlineTargetId)).evolution.events.some((event) => event.command?.action.note === "本地待放弃修改"),
  );
  assert.equal(
    (await bridge("localTasks.list", { accountId })).filter(
      (task) => task.title === conflictLocal.title && task.tags.includes("本地副本"),
    ).length,
    1,
  );
  record("采用云端版本需要二次确认，确认前保留本地修改，确认后不额外创建副本");
  source = await evolve(web, source, { type: "complete", note: "原任务按自身标准完成" });
  assert.equal(source.status, "done");
  assert.equal((await getTask(onlineTargetId)).status, "in_progress");
  await api(other, `/api/tasks/${child.id}`, "DELETE");
  const retryDeleted = await api(other, `/api/tasks/${source.id}/transfer`, "POST", offlineTransfer);
  assert.equal(retryDeleted.task, null);
  assert.equal((await web.get(`/api/tasks/${child.id}`)).status(), 404);
  await replay();
  await expect.poll(async () => Boolean(await local(child.id))).toBe(false);
  assert.ok((await getTask(source.id)).evolution.branches.some((branch) => branch.transferredTaskId === child.id));
  record("独立任务不阻塞来源验收，目标删除不清除来源历史且重试不复活目标");
  await app.page.goto(`app://taskflow/tasks/${source.id}/`);
  await app.page.getByRole("button", { name: "离线探索方案 已独立", exact: true }).click();
  const historicalBranch = app.page.getByRole("region", { name: "分支：离线探索方案", exact: true });
  await historicalBranch.getByRole("link", { name: "打开独立任务 ↗" }).click();
  await expect(historicalBranch.getByRole("status")).toContainText("未找到关联任务");
  await expect(app.page.getByRole("heading", { name: source.title, level: 1, exact: true })).toBeVisible();
  await app.context.setOffline(true);
  await historicalBranch.getByRole("button", { name: "重试", exact: true }).click();
  await expect(historicalBranch.getByRole("status")).toContainText("暂时无法读取");
  await app.context.setOffline(false);
  await historicalBranch.getByRole("button", { name: "重试", exact: true }).click();
  await expect(historicalBranch.getByRole("status")).toContainText("未找到关联任务");
  await app.page.screenshot({ path: path.join(root, "desktop-missing-task-relation.png") });
  record("删除目标保留历史及关联入口，网络失败与目标缺失分别反馈并可重试");
  await bridge("workspace.pause");
  await build({
    entryPoints: ["test/fixtures/task-evolution-long-history.ts"],
    bundle: true,
    platform: "node",
    format: "cjs",
    outfile: path.join(root, "long-history.cjs"),
  });
  const large = createRequire(import.meta.url)(path.join(root, "long-history.cjs")).longHistoryFixture(
    1000,
    30,
    marker,
  );
  const perfTask = await bridge("localTasks.create", { accountId, task: { ...large, tags: large.tags.join(", ") } });
  owned.add(perfTask.id);
  const graphStartedAt = performance.now();
  await app.page.goto(`app://taskflow/tasks/${perfTask.id}/`);
  await expect(app.page.getByRole("heading", { level: 1, name: perfTask.title, exact: true })).toBeVisible();
  await expect(app.page.locator(".task-evolution-graph-count")).toHaveText(/^1000(?:\s|$)/);
  const graphReadyMs = performance.now() - graphStartedAt;
  report.performance = await measureEvolutionBrowser(app.page, graphReadyMs);
  assert.equal(report.performance.rows, 30);
  assert.equal(report.performance.scrolling.complete, true, "可见窗口内未完成滚动帧采样");
  await app.page.screenshot({ path: path.join(root, "desktop-history-1000.png") });
  await bridge("localTasks.delete", { accountId, taskId: perfTask.id });
  record("1000 条历史、30 个分支在真实桌面按 30 行起步渲染，并完成可见窗口滚动采样");
  report.passed = true;
} catch (error) {
  report.error = String(error.message).replaceAll(email, "[redacted]").replaceAll(password, "[redacted]");
  console.error(`FAIL: ${report.error}`);
  process.exitCode = 1;
} finally {
  if (app) {
    await bridge("workspace.pause").catch(() => undefined);
    await app.context.setOffline(false).catch(() => undefined);
    await app.page
      .evaluate(async (base) => {
        await fetch(`${base}/api/auth/logout`, { method: "POST", credentials: "include" });
      }, origin)
      .catch(() => undefined);
    await bridge("auth.clear").catch(() => undefined);
  }
  const remaining = [];
  if (web) {
    // Discover a UI-created copy even if its successful IPC response was lost.
    const listed = await web.get("/api/tasks?export=1").catch(() => null);
    if (listed?.ok())
      for (const task of (await listed.json()).tasks ?? []) {
        if (task.title?.startsWith(marker) && task.tags?.includes("本地副本")) owned.add(task.id);
      }
    const cookie = (await web.storageState()).cookies.find(
      (item) => item.name === (process.env.APPWRITE_SESSION_COOKIE_NAME || "taskflow-session"),
    );
    for (const id of owned) {
      try {
        assert.ok(cookie?.value, "缺少验收会话，停止清理");
        const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT.replace(/\/$/, "");
        const url = `${endpoint}/tablesdb/${encodeURIComponent(process.env.APPWRITE_DATABASE_ID)}/tables/${encodeURIComponent(process.env.APPWRITE_TASKS_TABLE_ID)}/rows/${encodeURIComponent(id)}`;
        const headers = {
          "X-Appwrite-Project": process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID,
          "X-Appwrite-Session": cookie.value,
          "X-Appwrite-Response-Format": "1.8.0",
        };
        const row = await fetch(url, { headers, signal: AbortSignal.timeout(20000) });
        if (row.status === 404) continue;
        assert.ok(row.ok);
        const value = await row.json();
        assert.equal(value.$id, id);
        assert.ok(value.title.startsWith(marker), "只能清理本轮创建的验收行");
        assert.ok((await fetch(url, { method: "DELETE", headers, signal: AbortSignal.timeout(20000) })).ok);
      } catch {
        remaining.push(id);
      }
    }
  }
  report.cleanup = { ownedTaskIds: [...owned], remainingTaskIds: remaining };
  if (remaining.length) {
    report.passed = false;
    process.exitCode = 1;
  }
  await close().catch(() => {
    report.passed = false;
    process.exitCode = 1;
  });
  for (const client of clients) {
    await client.post("/api/auth/logout").catch(() => undefined);
    await client.dispose();
  }
  report.finishedAt = new Date().toISOString();
  await writeFile(path.join(root, "report.json"), JSON.stringify(report, null, 2));
  console.log(`验收报告：${path.join(root, "report.json")}`);
  console.log(`本轮测试数据清理：${remaining.length ? "未完成，见报告" : "已完成"}`);
}
