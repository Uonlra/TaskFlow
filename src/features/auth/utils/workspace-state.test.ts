import { describe, expect, it } from "vitest";

import { getWorkspaceErrorMessage, getWorkspaceState } from "@/features/auth/utils/workspace-state";

describe("getWorkspaceErrorMessage", () => {
  it("does not expose an authentication gate inside a feature page", () => {
    expect(getWorkspaceErrorMessage(new Error("请先登录后再查看总览。"), "总览数据暂时无法加载，请稍后重试。")).toBe(
      "总览数据暂时无法加载，请稍后重试。",
    );
  });

  it("keeps non-authentication errors actionable", () => {
    expect(getWorkspaceErrorMessage(new Error("网络连接失败。"), "通用错误")).toBe("网络连接失败。");
  });
});

describe("getWorkspaceState", () => {
  it("keeps the workspace pending while authentication is unresolved", () => {
    expect(
      getWorkspaceState({
        isAuthLoading: true,
        isTaskLoading: false,
        taskCount: 0,
        userId: null,
      }),
    ).toBe("auth-checking");
  });

  it("shows the guest state after authentication settles without a user", () => {
    expect(
      getWorkspaceState({
        isAuthLoading: false,
        isTaskLoading: true,
        taskCount: 0,
        userId: null,
      }),
    ).toBe("guest");
  });

  it("shows syncing only for an authenticated user with a task request in progress", () => {
    expect(
      getWorkspaceState({
        isAuthLoading: false,
        isTaskLoading: true,
        taskCount: 0,
        userId: "user-1",
      }),
    ).toBe("syncing");
  });

  it("shows the account empty state when an authenticated account has no tasks", () => {
    expect(
      getWorkspaceState({
        isAuthLoading: false,
        isTaskLoading: false,
        taskCount: 0,
        userId: "user-1",
      }),
    ).toBe("account-empty");
  });

  it("shows the ready state when authenticated task data is available", () => {
    expect(
      getWorkspaceState({
        isAuthLoading: false,
        isTaskLoading: false,
        taskCount: 2,
        userId: "user-1",
      }),
    ).toBe("ready");
  });
});
