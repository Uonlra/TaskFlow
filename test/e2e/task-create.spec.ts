import { expect, test } from "@playwright/test";

const authEnvelope = {
  user: {
    id: "e2e-user",
    email: "e2e@example.com",
    name: "E2E User",
    emailVerified: true,
  },
  profile: {
    id: "e2e-user",
    fullName: "E2E User",
    email: "e2e@example.com",
  },
  session: {
    expire: "2026-12-31T23:59:59.000Z",
  },
};

test.describe("创建任务", () => {
  test.use({
    viewport: {
      width: 1440,
      height: 900,
    },
  });

  test("登录用户可以创建任务并在列表中看到它", async ({ context, page }) => {
    await context.addCookies([
      {
        name: "taskflow-session",
        value: "mock-session",
        url: "http://127.0.0.1:3000",
      },
    ]);

    await page.route("**/api/auth/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(authEnvelope),
      });
    });

    let tasks: Array<Record<string, unknown>> = [];

    await page.route("**/api/tasks", async (route) => {
      const method = route.request().method();

      if (method === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ tasks }),
        });
        return;
      }

      if (method === "POST") {
        const input = route.request().postDataJSON() as {
          title: string;
          description: string;
          status: "todo" | "in_progress" | "done";
          priority: "low" | "medium" | "high";
          tags?: string;
          dueDate?: string;
        };

        const createdTask = {
          id: "task-e2e-1",
          title: input.title,
          description: input.description,
          status: input.status,
          priority: input.priority,
          tags: input.tags ? input.tags.split(/[，,]/).map((tag) => tag.trim()) : [],
          dueDate: input.dueDate || undefined,
          createdAt: "2026-08-13T10:00:00.000Z",
          updatedAt: "2026-08-13T10:00:00.000Z",
        };

        tasks = [createdTask];

        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({ task: createdTask }),
        });
        return;
      }

      await route.abort();
    });

    await page.goto("/tasks");
    await page.setViewportSize({ width: 1440, height: 620 });

    await expect(page.getByRole("heading", { name: "任务", exact: true })).toBeVisible();

    await page.getByRole("button", { name: "新建任务", exact: true }).click();

    await expect(page.locator("html")).toHaveCSS("overflow", "hidden");
    await expect(page.locator("body")).toHaveCSS("position", "fixed");
    await expect(page.locator(".task-dialog")).toHaveCSS("overflow-y", "auto");

    await page.getByRole("textbox", { name: "任务名称" }).fill("完成 E2E 学习");

    await page.getByRole("textbox", { name: "备注" }).fill("使用 Playwright 验证任务创建流程");

    await page.getByRole("button", { name: "具体描述" }).click();

    const taskDialog = page.getByRole("dialog");
    const initialDialogScrollTop = await taskDialog.evaluate((element) => element.scrollTop);
    await taskDialog.hover();
    await page.mouse.wheel(0, 420);
    await expect
      .poll(() => taskDialog.evaluate((element) => element.scrollTop))
      .toBeGreaterThan(initialDialogScrollTop);

    await taskDialog.getByRole("button", { name: /明天/ }).click();
    await expect(taskDialog.locator('input[name="dueDate"]')).not.toHaveValue("");

    await taskDialog.getByRole("button", { name: "选择具体日期" }).click();
    await expect(page.getByRole("dialog", { name: "选择截止日期" })).toBeVisible();
    await taskDialog.getByRole("button", { name: "选择具体日期" }).click();

    await page.getByRole("textbox", { name: "标签" }).fill("测试，学习");

    await page.getByRole("button", { name: "创建任务", exact: true }).click();

    const taskTable = page.getByRole("table", { name: "任务列表" });

    await expect(taskTable.getByText("完成 E2E 学习", { exact: true })).toBeVisible();

    await expect(taskTable.getByText("测试", { exact: true })).toBeVisible();
    await expect(taskTable.getByText("学习", { exact: true })).toBeVisible();
  });
});
