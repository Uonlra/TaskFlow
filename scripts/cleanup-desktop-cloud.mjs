import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { request } from "@playwright/test";

try {
  process.loadEnvFile(".env.local");
} catch {
  /* Use supplied environment. */
}
const root = path.resolve(process.argv[2] ?? "");
const parent = path.resolve("dist/electron");
assert.equal(path.dirname(root), parent);
const match = /^cloud-smoke-(\d+)$/.exec(path.basename(root));
assert.ok(match, "只支持本仓库的真实云验收目录");
const reportFile = path.join(root, "report.json");
const report = JSON.parse(await readFile(reportFile, "utf8"));
assert.ok(["https://www.uta4k.top", "http://127.0.0.1:3000"].includes(report.origin));
const client = await request.newContext({ baseURL: report.origin, timeout: 30_000 });
const remaining = new Set(report.cleanup.remainingTaskIds);
let completed = false;
async function fetchRow(url, options) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fetch(url, { ...options, signal: AbortSignal.timeout(20_000) });
    } catch (error) {
      if (attempt === 4) throw error;
      await delay(500 * (attempt + 1));
    }
  }
}
try {
  let login;
  for (let attempt = 0; attempt < 4; attempt++) {
    login = await client.post("/api/auth/login", {
      data: { email: process.env.TASKFLOW_E2E_EMAIL, password: process.env.TASKFLOW_E2E_PASSWORD },
      maxRetries: 2,
    });
    if (login.ok() || !/fetch failed|ECONNRESET|timeout/i.test((await login.json().catch(() => null))?.message ?? ""))
      break;
    await delay(1000);
  }
  if (!login.ok()) {
    const reason = (await login.json().catch(() => null))?.message ?? "无详情";
    throw new Error(`清理登录 HTTP ${login.status()}：${reason}`);
  }
  assert.equal(login.status(), 200, "清理会话登录失败");
  const session = (await client.storageState()).cookies.find(
    (cookie) => cookie.name === (process.env.APPWRITE_SESSION_COOKIE_NAME || "taskflow-session"),
  )?.value;
  assert.ok(session, "缺少测试账户会话");
  const headers = {
    "X-Appwrite-Project": process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID,
    "X-Appwrite-Session": session,
    "X-Appwrite-Response-Format": "1.8.0",
  };
  const base = `${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT?.replace(/\/$/, "")}/tablesdb/${encodeURIComponent(process.env.APPWRITE_DATABASE_ID)}/tables/${encodeURIComponent(process.env.APPWRITE_TASKS_TABLE_ID)}/rows`;
  if (process.argv.includes("--recover-manifest")) {
    let cursor;
    do {
      const url = new URL(base);
      const queries = [
        { method: "orderAsc", attribute: "$id" },
        { method: "limit", values: [100] },
        ...(cursor ? [{ method: "cursorAfter", values: [cursor] }] : []),
      ];
      queries.forEach((query) => url.searchParams.append("queries[]", JSON.stringify(query)));
      const response = await fetchRow(url, { headers });
      assert.ok(response.ok);
      const rows = (await response.json()).rows;
      for (const row of rows) {
        const tag = /^Desktop E2E (\d+) (local|remote|bulk \d+)$/.exec(row.title);
        if (tag && Math.abs(Number(tag[1]) - Number(match[1])) < 1000) remaining.add(row.$id);
      }
      const next = rows.length === 100 ? rows.at(-1).$id : null;
      assert.notEqual(next, cursor, "清理扫描游标未前进");
      cursor = next;
    } while (cursor);
    report.cleanup.remainingTaskIds = [...remaining];
    await writeFile(reportFile, JSON.stringify(report, null, 2));
    console.log(`已按本轮唯一标记恢复清单：${remaining.size}`);
  }
  for (const id of [...remaining]) {
    try {
      const url = `${base}/${encodeURIComponent(id)}`;
      const found = await fetchRow(url, { headers });
      if (found.status === 404) {
        remaining.delete(id);
        continue;
      }
      assert.ok(found.ok, `读取测试行 HTTP ${found.status}`);
      const row = await found.json();
      assert.equal(row.$id, id);
      const title = /^Desktop E2E (\d+) (local|remote|bulk \d+)$/.exec(row.title);
      assert.ok(title, "清理目标必须带验收标记");
      assert.ok(Math.abs(Number(title[1]) - Number(match[1])) < 1000, "任务不属于此轮验收");
      const removed = await fetchRow(url, { method: "DELETE", headers });
      assert.ok(removed.ok, `清理测试行 HTTP ${removed.status}`);
      assert.equal((await fetchRow(url, { headers })).status, 404);
      remaining.delete(id);
    } catch (error) {
      console.error(`清理失败：${error.message}`);
    }
  }
  completed = remaining.size === 0;
} finally {
  await client.post("/api/auth/logout").catch(() => undefined);
  await client.dispose();
  report.cleanup.remainingTaskIds = [...remaining];
  if (completed) report.cleanup.recoveredAt = new Date().toISOString();
  report.cleanup.recoveryCompleted = completed;
  await writeFile(reportFile, JSON.stringify(report, null, 2));
  console.log(`清理${completed ? "完成" : "未完成"}，已知剩余记录：${remaining.size}`);
  if (!completed) process.exitCode = 1;
}
