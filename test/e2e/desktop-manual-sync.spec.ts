import { expect, test } from "@playwright/test";
import type { TaskflowDesktopBridge } from "../../src/shared/lib/desktop/bridge";

test.use({ viewport: { width: 1440, height: 1000 } });
test("桌面连接和联网不自动同步，手动同步更新任务，失败保留本地内容", async ({ page, context }, testInfo) => {
  const task = {
    id: "manual-task",
    title: "本地待同步任务",
    description: "",
    status: "todo" as const,
    priority: "medium" as const,
    tags: [],
    createdAt: "2026-11-25T00:00:00Z",
    updatedAt: "2026-11-25T00:00:00Z",
  };
  const auth = {
    user: { id: "manual-user", email: "manual@example.com", name: "手动同步验收", emailVerified: true },
    profile: { id: "manual-user", email: "manual@example.com", fullName: "手动同步验收" },
    session: { expire: "2026-12-31T00:00:00Z" },
  };
  await context.addCookies([{ name: "taskflow-session", value: "manual-test", url: "http://127.0.0.1:3000" }]);
  await page.addInitScript(
    ({ task, auth }) => {
      let tasks = [task];
      let workspace = { accountId: auth.user.id, syncEnabled: false };
      let pending = [
        {
          operationId: "manual-operation",
          accountId: auth.user.id,
          taskId: task.id,
          operation: "upsert",
          payload: task,
          clientUpdatedAt: task.updatedAt,
          attempts: 0,
          createdAt: task.createdAt,
        },
      ];
      window.taskflowDesktop = {
        isDesktop: true,
        platform: "win32",
        version: "test",
        shell: {
          quickWindow: false,
          menu: async () => {},
          theme: async () => {},
          onSettings: () => () => {},
          onTasksChanged: () => () => {},
        },
        auth: { get: async () => auth, set: async () => {}, clear: async () => {} },
        workspace: {
          get: async () => workspace,
          connect: async () => {
            workspace = { ...workspace, syncEnabled: true };
            return workspace;
          },
          pause: async () => {
            workspace = { ...workspace, syncEnabled: false };
            return workspace;
          },
        },
        localTasks: {
          list: async () => tasks,
          get: async () => tasks[0] ?? null,
          upsert: async (input: Parameters<TaskflowDesktopBridge["localTasks"]["upsert"]>[0]) => {
            tasks = input.tasks as typeof tasks;
            return tasks;
          },
        },
        syncQueue: {
          list: async () => pending,
          settle: async () => {
            pending = [];
            return tasks;
          },
          fail: async () => {},
          conflicts: async () => [],
        },
        updates: {
          getState: async () => ({
            phase: "idle",
            currentVersion: "test",
            channel: "beta",
            version: null,
            percent: 0,
            message: "",
          }),
          subscribe: () => () => {},
        },
        shortcuts: { get: async () => ({ shortcut: "", enabled: false, registered: false, message: "" }) },
      } as unknown as TaskflowDesktopBridge;
    },
    { task, auth },
  );
  const requests: string[] = [];
  let unavailable = false;
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    requests.push(`${request.method()} ${pathname}`);
    if (pathname !== "/api/tasks/sync" || unavailable) {
      await route.fulfill({ status: 503, json: { message: "云端暂时不可用" } });
      return;
    }
    await route.fulfill({
      status: 200,
      json:
        request.method() === "POST"
          ? { results: [{ operationId: "manual-operation", taskId: task.id, status: "applied", task }] }
          : { tasks: [{ ...task, title: "手动更新后的云端任务" }], nextCursor: null },
    });
  });
  await page.goto("/settings");
  const panel = page.getByRole("region", { name: "本地存储与云同步" });
  await expect(panel.getByRole("button", { name: "连接云端账户", exact: true })).toBeEnabled();
  expect(requests).toEqual([]);
  await panel.getByRole("button", { name: "连接云端账户", exact: true }).click();
  const sync = panel.getByRole("button", { name: "立即同步", exact: true });
  await expect(sync).toBeVisible();
  const titlebarSync = page
    .getByRole("banner", { name: "应用标题栏" })
    .getByRole("button", { name: "立即同步", exact: true });
  await expect(titlebarSync).toBeVisible();
  await page.evaluate(() => {
    window.dispatchEvent(new Event("online"));
    window.dispatchEvent(new Event("focus"));
  });
  expect(requests).toEqual([]);
  await sync.click();
  await expect(page.getByText("手动同步完成", { exact: true })).toBeVisible();
  expect(requests).toEqual(["POST /api/tasks/sync", "GET /api/tasks/sync"]);
  expect(
    await page.evaluate(
      async () => (await window.taskflowDesktop!.localTasks.list({ accountId: "manual-user" }))[0].title,
    ),
  ).toBe("手动更新后的云端任务");
  unavailable = true;
  await titlebarSync.click();
  await expect(page.getByText("同步未完成", { exact: true })).toBeVisible();
  await expect(sync).toBeEnabled();
  expect(requests).toHaveLength(3);
  expect(
    await page.evaluate(
      async () => (await window.taskflowDesktop!.localTasks.list({ accountId: "manual-user" }))[0].title,
    ),
  ).toBe("手动更新后的云端任务");
  await page.screenshot({ path: testInfo.outputPath("manual-sync.png") });
});
