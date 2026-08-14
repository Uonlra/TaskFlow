import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAppwriteSessionSecret: vi.fn(),
  getCurrentAccount: vi.fn(),
  listTasks: vi.fn(),
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
}));

import { getTaskPageInitialData } from "@/features/tasks/server/get-task-page-initial-data";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getTaskPageInitialData", () => {
  it("没有会话时跳过 Appwrite 请求", async () => {
    mocks.getAppwriteSessionSecret.mockResolvedValue(null);

    await expect(getTaskPageInitialData()).resolves.toBeNull();
    expect(mocks.getCurrentAccount).not.toHaveBeenCalled();
    expect(mocks.listTasks).not.toHaveBeenCalled();
  });

  it("并行读取账户与任务并返回可序列化的初始数据", async () => {
    const tasks = [{ id: "task-1", tags: [] }];
    mocks.getAppwriteSessionSecret.mockResolvedValue("session-secret");
    mocks.getCurrentAccount.mockResolvedValue({ $id: "user-1" });
    mocks.listTasks.mockResolvedValue(tasks);

    await expect(getTaskPageInitialData()).resolves.toEqual({
      userId: "user-1",
      tasks,
    });
    expect(mocks.getCurrentAccount).toHaveBeenCalledWith("session-secret");
    expect(mocks.listTasks).toHaveBeenCalledWith("session-secret");
  });

  it("预取失败时返回 null 以启用客户端同步兜底", async () => {
    mocks.getAppwriteSessionSecret.mockResolvedValue("expired-session");
    mocks.getCurrentAccount.mockRejectedValue(new Error("session expired"));
    mocks.listTasks.mockResolvedValue([]);

    await expect(getTaskPageInitialData()).resolves.toBeNull();
  });
});
