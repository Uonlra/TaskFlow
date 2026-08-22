import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAppwriteSessionSecret: vi.fn(),
  getCurrentAccount: vi.fn(),
  listTasks: vi.fn(),
  listTasksPage: vi.fn(),
  canUseAppwriteTaskPage: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/shared/lib/appwrite/session", () => ({
  getAppwriteSessionSecret: mocks.getAppwriteSessionSecret,
}));
vi.mock("@/shared/lib/appwrite/server", () => ({
  getCurrentAccount: mocks.getCurrentAccount,
}));
vi.mock("@/shared/lib/appwrite/tasks", () => ({
  listTasks: mocks.listTasks,
  listTasksPage: mocks.listTasksPage,
  canUseAppwriteTaskPage: mocks.canUseAppwriteTaskPage,
}));

import { getTaskPageInitialData } from "@/features/tasks/server/get-task-page-initial-data";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.canUseAppwriteTaskPage.mockReturnValue(true);
});

describe("getTaskPageInitialData", () => {
  it("没有会话时跳过 Appwrite 请求", async () => {
    mocks.getAppwriteSessionSecret.mockResolvedValue(null);

    await expect(getTaskPageInitialData()).resolves.toBeNull();
    expect(mocks.getCurrentAccount).not.toHaveBeenCalled();
    expect(mocks.listTasks).not.toHaveBeenCalled();
  });

  it("并行读取账户与任务并返回可序列化的初始数据", async () => {
    const page = {
      tasks: [{ id: "task-1", tags: [] }],
      total: 1,
      page: 1,
      pageSize: 50,
      hasNext: false,
      categoryCounts: { near: 0, active: 1, done: 0, all: 1 },
    };
    mocks.getAppwriteSessionSecret.mockResolvedValue("session-secret");
    mocks.getCurrentAccount.mockResolvedValue({ $id: "user-1" });
    mocks.listTasksPage.mockResolvedValue(page);

    await expect(getTaskPageInitialData()).resolves.toEqual({
      userId: "user-1",
      ...page,
    });
    expect(mocks.getCurrentAccount).toHaveBeenCalledWith("session-secret");
    expect(mocks.listTasksPage).toHaveBeenCalledWith("session-secret", expect.any(Object), 1);
  });

  it("预取失败时返回 null 以启用客户端同步兜底", async () => {
    mocks.getAppwriteSessionSecret.mockResolvedValue("expired-session");
    mocks.getCurrentAccount.mockRejectedValue(new Error("session expired"));
    mocks.listTasksPage.mockResolvedValue({
      tasks: [],
      total: 0,
      page: 1,
      pageSize: 50,
      hasNext: false,
      categoryCounts: { near: 0, active: 0, done: 0, all: 0 },
    });

    await expect(getTaskPageInitialData()).resolves.toBeNull();
  });
});
