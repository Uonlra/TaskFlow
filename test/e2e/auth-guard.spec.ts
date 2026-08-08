import { expect, test } from "@playwright/test";

test.describe("未登录访问任务页", () => {
  test("显示访客状态并提供登录入口", async ({ context, page }) => {
    await context.clearCookies();

    await page.goto("/tasks");

    await expect(page).toHaveURL(/\/tasks$/);

    await expect(
      page.getByRole("heading", { name: "登录后管理你的任务" }),
    ).toBeVisible();

    await expect(
      page.getByRole("link", { name: "登录后继续" }),
    ).toHaveAttribute("href", "/login?next=%2Ftasks");
  });
});