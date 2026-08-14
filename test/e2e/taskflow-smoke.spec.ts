import { expect, test } from "@playwright/test";

const email = process.env.TASKFLOW_E2E_EMAIL;
const password = process.env.TASKFLOW_E2E_PASSWORD;

test.describe("TaskFlow 真实冒烟测试", () => {
    test.use({
        viewport: {
            width: 1440,
            height: 900,
        },
    });

    test("登录后完成创建、更新、删除任务的完整链路", async ({ page }) => {
        test.skip(
            !email || !password,
            "缺少 TASKFLOW_E2E_EMAIL 或 TASKFLOW_E2E_PASSWORD 环境变量，已跳过真实冒烟测试。",
        );

        const title = `E2E 测试任务 ${Date.now()}`;

        await page.goto("/login");

        await page.getByRole("textbox", { name: "邮箱" }).fill(email!);
        await page.getByRole("textbox", { name: "密码" }).fill(password!);
        await page.getByRole("button", { name: "登录", exact: true }).click();

        await expect(
            page.getByRole("button", { name: "继续", exact: true }),
        ).toBeVisible({ timeout: 30_000 });

        await page.getByRole("button", { name: "继续", exact: true }).click();

        await expect(page).toHaveURL(/\/dashboard/);

        await page.goto("/tasks");

        await expect(
            page.getByRole("heading", { name: "任务", exact: true }),
        ).toBeVisible();

        await page.getByRole("button", { name: "新建任务", exact: true }).click();

        await page.getByRole("textbox", { name: "任务名称" }).fill(title);
        await page
            .getByRole("textbox", { name: "备注" })
            .fill("真实 Appwrite 冒烟测试任务");
        await page.getByRole("button", { name: "创建任务", exact: true }).click();

        const taskTable = page.getByRole("table", { name: "任务列表" });
        await expect(
            taskTable.getByText(title, { exact: true }),
        ).toBeVisible({ timeout: 15_000 });

        await taskTable.getByText(title, { exact: true }).click();

        await page.getByRole("button", { name: "待开始", exact: true }).click();
        await expect(
            page.getByRole("button", { name: "已完成", exact: true }),
        ).toBeVisible();

        await page.getByRole("button", { name: "删除", exact: true }).click();
        await page.getByRole("button", { name: "确认删除", exact: true }).click();

        await expect(
            taskTable.getByText(title, { exact: true }),
        ).toHaveCount(0);
    });
});
