import { expect, test } from "@playwright/test";

test.describe("未登录访问工作区", () => {
  test("主页访客可以点击登录进入登录页", async ({ context, page }) => {
    await context.clearCookies();

    await page.goto("/");

    await expect(page).toHaveURL(/\/dashboard$/);

    const loginLink = page.getByRole("link", { name: "登录后继续" });
    await expect(loginLink).toHaveAttribute("href", "/login?next=%2Fdashboard");

    await loginLink.click();

    await expect(page).toHaveURL("/login?next=%2Fdashboard");
    await expect(page.getByRole("heading", { name: "欢迎回来" })).toBeVisible();
  });

  test("显示访客状态并提供登录入口", async ({ context, page }) => {
    await context.clearCookies();

    await page.goto("/tasks");

    await expect(page).toHaveURL(/\/tasks$/);

    await expect(
      page.getByRole("heading", { name: "登录后管理你的任务" }),
    ).toBeVisible();

    const loginLink = page.getByRole("link", { name: "登录后继续" });

    await expect(loginLink).toHaveAttribute("href", "/login?next=%2Ftasks");
    await loginLink.click();
    await expect(page).toHaveURL("/login?next=%2Ftasks");
    await expect(page.getByRole("heading", { name: "欢迎回来" })).toBeVisible();
  });
});
