import { expect, test } from "@playwright/test";

test.describe("登录表单", () => {
  test("空提交显示字段校验错误", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByRole("heading", { name: "欢迎回来" })).toBeVisible();

    await page.getByRole("button", { name: "登录", exact: true }).click();

    await expect(page.getByText("请输入有效的邮箱地址。")).toBeVisible();

    await expect(page.getByText("密码至少需要 8 位。")).toBeVisible();
  });

  test("登录接口失败时显示错误信息", async ({ page }) => {
    await page.route("**/api/auth/login", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          message: "邮箱或密码不正确。",
        }),
      });
    });

    await page.goto("/login");

    await page.getByRole("textbox", { name: "邮箱" }).fill("demo@example.com");
    await page.getByRole("textbox", { name: "密码" }).fill("password123");
    await page.getByRole("button", { name: "登录", exact: true }).click();

    await expect(page.getByRole("main").getByText("邮箱或密码不正确。", { exact: true })).toBeVisible();
  });

  test("密码可以显示和隐藏", async ({ page }) => {
    await page.goto("/login");

    const passwordInput = page.getByRole("textbox", { name: "密码" });
    const showPasswordButton = page.getByRole("button", { name: "显示密码" });

    await expect(passwordInput).toHaveAttribute("type", "password");
    await expect(showPasswordButton).toHaveAttribute("aria-pressed", "false");

    await showPasswordButton.click();

    await expect(passwordInput).toHaveAttribute("type", "text");
    await expect(page.getByRole("button", { name: "隐藏密码" })).toHaveAttribute("aria-pressed", "true");

    await page.getByRole("button", { name: "隐藏密码" }).click();

    await expect(passwordInput).toHaveAttribute("type", "password");
    await expect(page.getByRole("button", { name: "显示密码" })).toHaveAttribute("aria-pressed", "false");
  });
});
