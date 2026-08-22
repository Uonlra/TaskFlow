// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthProvider, useAuth } from "@/features/auth/providers/auth-provider";

const mocks = vi.hoisted(() => ({
  clearTasks: vi.fn(),
  syncTasks: vi.fn(),
}));

vi.mock("@/shared/lib/appwrite/env", () => ({
  hasAppwritePublicEnv: true,
}));

vi.mock("@/features/tasks/store/task-store", () => ({
  useTaskStore: (
    selector: (state: { clearTasks: typeof mocks.clearTasks; syncTasks: typeof mocks.syncTasks }) => unknown,
  ) =>
    selector({
      clearTasks: mocks.clearTasks,
      syncTasks: mocks.syncTasks,
    }),
}));

const authEnvelope = {
  user: {
    id: "user-1",
    email: "demo@example.com",
    name: "测试用户",
    emailVerified: true,
  },
  profile: {
    id: "user-1",
    fullName: "测试用户",
    email: "demo@example.com",
    avatarUrl: "https://example.com/avatar.png",
  },
  session: {
    expire: "2026-12-31T23:59:59.000Z",
  },
};

function AuthStateProbe() {
  const { user, profile, isLoading, isAuthenticated } = useAuth();

  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="authenticated">{String(isAuthenticated)}</span>
      <span data-testid="email">{user?.email ?? "guest"}</span>
      <span data-testid="profile">{profile?.fullName ?? "no-profile"}</span>
    </div>
  );
}

function renderAuthProvider() {
  return render(
    <AuthProvider>
      <AuthStateProbe />
    </AuthProvider>,
  );
}

function AuthActionsProbe() {
  const { user, profile, isAuthenticated, signOut, refreshProfile, saveProfile } = useAuth();

  return (
    <div>
      <span data-testid="action-authenticated">{String(isAuthenticated)}</span>
      <span data-testid="action-name">{profile?.fullName ?? "no-profile"}</span>
      <span data-testid="action-email">{user?.email ?? "guest"}</span>
      <button type="button" onClick={() => void signOut()}>
        退出测试
      </button>
      <button type="button" onClick={() => void refreshProfile()}>
        刷新资料
      </button>
      <button
        type="button"
        onClick={() =>
          void saveProfile({
            fullName: "更新用户",
            avatarUrl: "https://example.com/updated.png",
          })
        }
      >
        保存资料
      </button>
    </div>
  );
}

function renderAuthActions() {
  return render(
    <AuthProvider>
      <AuthActionsProbe />
    </AuthProvider>,
  );
}

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("成功读取当前用户后恢复认证状态", async () => {
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify(authEnvelope), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );

    renderAuthProvider();

    expect(screen.getByTestId("loading")).toHaveTextContent("true");
    expect(screen.getByTestId("authenticated")).toHaveTextContent("false");

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });

    expect(screen.getByTestId("authenticated")).toHaveTextContent("true");
    expect(screen.getByTestId("email")).toHaveTextContent("demo@example.com");
    expect(screen.getByTestId("profile")).toHaveTextContent("测试用户");
    expect(mocks.syncTasks).toHaveBeenCalledWith("user-1");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/me",
      expect.objectContaining({
        cache: "no-store",
        signal: expect.any(AbortSignal),
      }),
    );

    expect(mocks.clearTasks).not.toHaveBeenCalled();
  });

  it("当前会话无效时保持访客状态并清空任务", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          message: "请先登录。",
        }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    );

    renderAuthProvider();

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });

    expect(screen.getByTestId("authenticated")).toHaveTextContent("false");
    expect(screen.getByTestId("email")).toHaveTextContent("guest");
    expect(screen.getByTestId("profile")).toHaveTextContent("no-profile");
    expect(mocks.clearTasks).toHaveBeenCalledTimes(1);
  });

  it("signOut 结束会话并清空认证与任务状态", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify(authEnvelope), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    renderAuthActions();

    await waitFor(() => {
      expect(screen.getByTestId("action-authenticated")).toHaveTextContent("true");
    });

    await user.click(screen.getByRole("button", { name: "退出测试" }));

    await waitFor(() => {
      expect(screen.getByTestId("action-authenticated")).toHaveTextContent("false");
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/auth/logout", { method: "POST" });
    expect(screen.getByTestId("action-email")).toHaveTextContent("guest");
    expect(mocks.clearTasks).toHaveBeenCalledTimes(1);
  });

  it("refreshProfile 重新读取资料并同步用户名称", async () => {
    const user = userEvent.setup();
    const refreshedProfile = {
      ...authEnvelope.profile,
      fullName: "刷新用户",
    };
    const fetchMock = vi
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify(authEnvelope), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ profile: refreshedProfile }), { status: 200 }));

    renderAuthActions();

    await waitFor(() => {
      expect(screen.getByTestId("action-authenticated")).toHaveTextContent("true");
    });

    await user.click(screen.getByRole("button", { name: "刷新资料" }));

    await waitFor(() => {
      expect(screen.getByTestId("action-name")).toHaveTextContent("刷新用户");
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/profile", { cache: "no-store" });
    expect(screen.getByTestId("action-email")).toHaveTextContent("demo@example.com");
  });

  it("saveProfile 保存资料并更新当前用户显示", async () => {
    const user = userEvent.setup();
    const savedProfile = {
      ...authEnvelope.profile,
      fullName: "更新用户",
      avatarUrl: "https://example.com/updated.png",
    };
    const fetchMock = vi
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify(authEnvelope), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ profile: savedProfile }), { status: 200 }));

    renderAuthActions();

    await waitFor(() => {
      expect(screen.getByTestId("action-authenticated")).toHaveTextContent("true");
    });

    await user.click(screen.getByRole("button", { name: "保存资料" }));

    await waitFor(() => {
      expect(screen.getByTestId("action-name")).toHaveTextContent("更新用户");
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/profile",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          fullName: "更新用户",
          avatarUrl: "https://example.com/updated.png",
        }),
      }),
    );
  });
});
