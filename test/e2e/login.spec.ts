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
    await page.getByLabel("密码", { exact: true }).fill("password123");
    await page.getByRole("button", { name: "登录", exact: true }).click();

    await expect(page.getByRole("main").getByText("邮箱或密码不正确。", { exact: true })).toBeVisible();
  });

  test("登录成功并完成任务同步后自动返回原页面", async ({ page }) => {
    await page.route("**/api/auth/login", (route) =>
      route.fulfill({
        json: { user: { id: "demo", name: "Demo" }, profile: { fullName: "Demo" }, session: null },
      }),
    );
    await page.route("**/api/tasks", (route) => route.fulfill({ json: { tasks: [] } }));
    await page.route("**/api/auth/lookup?**", (route) => route.fulfill({ json: { status: "registered" } }));
    await page.goto("/login?next=%2Ftasks%3Fview%3Dlist");
    await page.getByLabel("邮箱", { exact: true }).fill("demo@example.com");
    await page.getByLabel("密码", { exact: true }).fill("password123");
    const synced = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/tasks");
    await page.getByRole("button", { name: "登录", exact: true }).click();
    await synced;
    await expect(page).toHaveURL(/\/tasks\?view=list$/);
  });

  test("密码可以显示和隐藏", async ({ page }) => {
    await page.goto("/login");

    const passwordInput = page.getByLabel("密码", { exact: true });
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
