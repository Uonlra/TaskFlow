import { expect, test } from "@playwright/test";

test.describe("未登录访问工作区", () => {
  test("主页访客显示离线状态并可以进入登录页", async ({ context, page }) => {
    await context.clearCookies();

    await page.goto("/");

    await expect(page).toHaveURL(/\/dashboard$/);
    const guestStatus = page.getByRole("status", { name: "访客数据保存状态" });
    await expect(guestStatus).toBeVisible();
    await expect(guestStatus).toContainText("离线访客模式");
    await expect(guestStatus).toContainText("数据临时保存在当前浏览器，关闭后将无法恢复。");

    const loginLink = page.getByRole("link", { name: "登录并同步" });
    await expect(loginLink).toHaveAttribute("href", "/login?next=%2Fdashboard");

    await loginLink.click();

    await expect(page).toHaveURL("/login?next=%2Fdashboard");
    await expect(page.getByRole("heading", { name: "欢迎回来" })).toBeVisible();
  });

  test("任务页访客保留功能入口并提示临时保存", async ({ context, page }) => {
    await context.clearCookies();

    await page.goto("/tasks");

    await expect(page).toHaveURL(/\/tasks$/);
    await expect(page.getByRole("status", { name: "访客数据保存状态" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "任务", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "新建任务", exact: true })).toBeVisible();

    const loginLink = page.getByRole("link", { name: "登录并同步" });
    await expect(loginLink).toHaveAttribute("href", "/login?next=%2Ftasks");
  });
});
