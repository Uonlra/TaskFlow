import { describe, expect, it } from "vitest";

import { getWorkspaceState } from "@/features/auth/utils/workspace-state";

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