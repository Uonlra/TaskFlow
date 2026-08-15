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

test("任务详情可以切换到活动时间线", async ({ context, page }) => {
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

  await page.route("**/api/tasks", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        tasks: [
          {
            id: "task-e2e-activity",
            title: "验证活动时间线",
            description: "确认标签切换在完整页面中生效。",
            status: "done",
            priority: "medium",
            tags: ["测试"],
            dueDate: "2026-08-20",
            createdAt: "2026-08-15T08:00:00.000Z",
            updatedAt: "2026-08-15T09:00:00.000Z",
            completedAt: "2026-08-15T10:00:00.000Z",
          },
        ],
      }),
    });
  });

  await page.goto("/tasks");

  const detailPanel = page.getByRole("complementary", { name: "任务详情" });
  const activityTab = detailPanel.getByRole("tab", { name: "活动" });

  await activityTab.click();

  await expect(activityTab).toHaveAttribute("aria-selected", "true");
  await expect(detailPanel.getByRole("heading", { name: "任务活动" })).toBeVisible();
  await expect(detailPanel.getByText("完成任务", { exact: true })).toBeVisible();
  await expect(detailPanel.getByText("最近更新", { exact: true })).toBeVisible();
  await expect(detailPanel.getByText("创建任务", { exact: true })).toBeVisible();
});
