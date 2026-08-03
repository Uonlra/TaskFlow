import { expect, test } from "@playwright/test";

test.describe("登录表单", () => {
  test("空提交显示字段校验错误", async ({ page }) => {
    await page.goto("/login");

    await expect(
      page.getByRole("heading", { name: "欢迎回来" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "登录", exact: true }).click();

    await expect(
      page.getByText("请输入有效的邮箱地址。"),
    ).toBeVisible();

    await expect(
      page.getByText("密码至少需要 8 位。"),
    ).toBeVisible();
  });
});