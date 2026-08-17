// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthPreviewStateProvider } from "@/features/auth/components/auth-preview-state";
import { RegisterForm } from "@/features/auth/components/register-form";

const mocks = vi.hoisted(() => ({
  showToast: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mocks.replace,
    refresh: mocks.refresh,
  }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/shared/lib/appwrite/env", () => ({
  hasAppwritePublicEnv: true,
}));

vi.mock("@/shared/providers/toast-provider", () => ({
  useToast: () => ({
    showToast: mocks.showToast,
  }),
}));

vi.mock("@/features/auth/hooks/use-auth-account-lookup", () => ({
  useAuthAccountLookup: vi.fn(),
}));

function renderRegisterForm() {
  return render(
    <AuthPreviewStateProvider>
      <RegisterForm />
    </AuthPreviewStateProvider>,
  );
}

describe("RegisterForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("空提交时显示注册字段校验错误", async () => {
    const user = userEvent.setup();

    renderRegisterForm();

    await user.click(screen.getByRole("button", { name: "创建任务本" }));

    expect(await screen.findByText("姓名至少需要 2 个字符。")).toBeInTheDocument();
    expect(screen.getByText("请输入有效的邮箱地址。")).toBeInTheDocument();
    expect(screen.getByText("密码至少需要 8 位。")).toBeInTheDocument();
    expect(screen.getByText("请再次输入密码。")).toBeInTheDocument();
  });

  it("在密码交互后提供长度和一致性反馈", async () => {
    const user = userEvent.setup();

    renderRegisterForm();

    expect(screen.queryByText("至少 8 个字符")).not.toBeInTheDocument();

    await user.click(screen.getByLabelText("密码"));
    expect(screen.getByText("至少 8 个字符")).toBeInTheDocument();

    await user.type(screen.getByLabelText("密码"), "password");
    expect(screen.getByText("已满足至少 8 个字符")).toBeInTheDocument();

    await user.type(screen.getByLabelText("确认密码"), "different");
    expect(screen.getByText("两次输入的密码不一致")).toBeInTheDocument();

    await user.clear(screen.getByLabelText("确认密码"));
    await user.type(screen.getByLabelText("确认密码"), "password");
    expect(screen.getByText("两次密码一致")).toBeInTheDocument();
  });

  it("注册接口失败时显示服务端错误并发送错误 Toast", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ message: "该邮箱已注册。" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }),
    );

    renderRegisterForm();

    await user.type(screen.getByLabelText("姓名"), "测试用户");
    await user.type(screen.getByLabelText("邮箱"), "demo@example.com");
    await user.type(screen.getByLabelText("密码"), "password123");
    await user.type(screen.getByLabelText("确认密码"), "password123");
    await user.click(screen.getByRole("button", { name: "创建任务本" }));

    expect(await screen.findByText("该邮箱已注册。")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/register",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          name: "测试用户",
          email: "demo@example.com",
          password: "password123",
          confirmPassword: "password123",
        }),
      }),
    );
    expect(mocks.showToast).toHaveBeenCalledWith({
      title: "注册失败",
      description: "该邮箱已注册。",
      tone: "error",
    });
  });
});
