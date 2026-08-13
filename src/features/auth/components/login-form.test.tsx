// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LoginForm } from "@/features/auth/components/login-form";
import { AuthPreviewStateProvider } from "@/features/auth/components/auth-preview-state";

const mocks = vi.hoisted(() => {
    const applyAuthEnvelope = vi.fn();
    const syncTasks = vi.fn().mockResolvedValue(undefined);
    const showToast = vi.fn();

    const useTaskStore = Object.assign(
        vi.fn((selector: (state: { syncTasks: typeof syncTasks }) => unknown) =>
            selector({ syncTasks }),
        ),
        {
            getState: vi.fn(() => ({ error: null })),
        },
    );

    return {
        applyAuthEnvelope,
        syncTasks,
        showToast,
        useTaskStore,
    };
});

vi.mock("next/navigation", () => ({
    useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/shared/lib/appwrite/env", () => ({
    hasAppwritePublicEnv: true,
}));

vi.mock("@/features/auth/providers/auth-provider", () => ({
    useAuth: () => ({
        applyAuthEnvelope: mocks.applyAuthEnvelope,
    }),
}));

vi.mock("@/shared/providers/toast-provider", () => ({
    useToast: () => ({
        showToast: mocks.showToast,
    }),
}));

vi.mock("@/features/tasks/store/task-store", () => ({
    useTaskStore: mocks.useTaskStore,
}));

vi.mock("@/features/auth/hooks/use-auth-account-lookup", () => ({
    useAuthAccountLookup: vi.fn(),
}));

function renderLoginForm() {
    return render(
        <AuthPreviewStateProvider>
            <LoginForm />
        </AuthPreviewStateProvider>,
    );
}

describe("LoginForm", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("空提交时显示邮箱和密码校验错误", async () => {
        const user = userEvent.setup();

        renderLoginForm();

        await user.click(screen.getByRole("button", { name: "登录", exact: true }));

        expect(
            await screen.findByText("请输入有效的邮箱地址。"),
        ).toBeInTheDocument();

        expect(
            screen.getByText("密码至少需要 8 位。"),
        ).toBeInTheDocument();
    });

    it("登录接口失败时显示服务端错误信息", async () => {
        const user = userEvent.setup();

        vi.spyOn(global, "fetch").mockResolvedValue(
            new Response(
                JSON.stringify({
                    message: "邮箱或密码不正确。",
                }),
                {
                    status: 401,
                    headers: {
                        "Content-Type": "application/json",
                    },
                },
            ),
        );

        renderLoginForm();

        const emailInput = screen.getByLabelText("邮箱");
        const passwordInput = screen.getByLabelText("密码");

        await user.type(emailInput, "demo@example.com");
        await user.type(passwordInput, "password123");

        await user.click(
            screen.getByRole("button", { name: "登录", exact: true }),
        );

        expect(
            await screen.findByText("邮箱或密码不正确。"),
        ).toBeInTheDocument();

        expect(global.fetch).toHaveBeenCalledWith(
            "/api/auth/login",
            expect.objectContaining({
                method: "POST",
            }),
        );

        expect(mocks.showToast).toHaveBeenCalledWith(
            expect.objectContaining({
                title: "登录失败",
                tone: "error",
            }),
        );

        vi.restoreAllMocks();
    });
});