import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDesktopBridge: vi.fn(),
  requestJson: vi.fn(),
}));

vi.mock("@/shared/lib/api/client", () => ({
  requestJson: mocks.requestJson,
}));

vi.mock("@/shared/lib/desktop/bridge", () => ({
  getDesktopBridge: mocks.getDesktopBridge,
}));

import { flushDesktopSyncQueue, pullDesktopSyncRecords } from "@/features/tasks/sync/desktop-sync";

const task = {
  id: "task-1",
  title: "离线任务",
  description: "",
  status: "todo" as const,
  priority: "medium" as const,
  tags: [],
  createdAt: "2026-10-30T09:00:00.000Z",
  updatedAt: "2026-10-30T09:00:00.000Z",
};

function createBridge() {
  return {
    localTasks: {
      upsert: vi.fn().mockResolvedValue([task]),
    },
    syncQueue: {
      list: vi.fn().mockResolvedValue([
        {
          operationId: "operation-1",
          accountId: "user-1",
          taskId: "task-1",
          operation: "upsert",
          payload: task,
          clientUpdatedAt: task.updatedAt,
          attempts: 0,
          createdAt: task.createdAt,
        },
      ]),
      acknowledge: vi.fn().mockResolvedValue(undefined),
      fail: vi.fn().mockResolvedValue(undefined),
    },
  };
}

describe("flushDesktopSyncQueue", () => {
  beforeEach(() => vi.clearAllMocks());

  it("提交队列并导入服务端返回的任务后确认操作", async () => {
    const bridge = createBridge();
    mocks.getDesktopBridge.mockReturnValue(bridge);
    mocks.requestJson.mockResolvedValue({
      results: [{ operationId: "operation-1", taskId: "task-1", status: "applied", task }],
    });

    await expect(flushDesktopSyncQueue("user-1")).resolves.toEqual({ processed: 1, failed: 0 });
    expect(mocks.requestJson).toHaveBeenCalledWith(
      "/api/tasks/sync",
      expect.objectContaining({ method: "POST", body: { operations: expect.any(Array) } }),
    );
    expect(bridge.localTasks.upsert).toHaveBeenCalledWith({ accountId: "user-1", tasks: [task] });
    expect(bridge.syncQueue.acknowledge).toHaveBeenCalledWith({
      accountId: "user-1",
      operations: [{ operationId: "operation-1" }],
    });
    expect(bridge.syncQueue.acknowledge.mock.invocationCallOrder[0]).toBeLessThan(
      bridge.localTasks.upsert.mock.invocationCallOrder[0],
    );
    expect(bridge.syncQueue.fail).not.toHaveBeenCalled();
  });

  it("保留服务端失败的操作并记录错误", async () => {
    const bridge = createBridge();
    mocks.getDesktopBridge.mockReturnValue(bridge);
    mocks.requestJson.mockResolvedValue({
      results: [{ operationId: "operation-1", taskId: "task-1", status: "error", message: "服务暂不可用" }],
    });

    await expect(flushDesktopSyncQueue("user-1")).resolves.toEqual({ processed: 0, failed: 1 });
    expect(bridge.syncQueue.acknowledge).not.toHaveBeenCalled();
    expect(bridge.syncQueue.fail).toHaveBeenCalledWith({
      accountId: "user-1",
      failures: [{ operationId: "operation-1", message: "服务暂不可用" }],
    });
  });

  it("请求失败时不确认队列并累加失败记录", async () => {
    const bridge = createBridge();
    mocks.getDesktopBridge.mockReturnValue(bridge);
    mocks.requestJson.mockRejectedValue(new Error("网络不可用"));

    await expect(flushDesktopSyncQueue("user-1")).rejects.toThrow("网络不可用");
    expect(bridge.syncQueue.acknowledge).not.toHaveBeenCalled();
    expect(bridge.syncQueue.fail).toHaveBeenCalledWith({
      accountId: "user-1",
      failures: [{ operationId: "operation-1", message: "网络不可用" }],
    });
  });
});

describe("pullDesktopSyncRecords", () => {
  beforeEach(() => mocks.requestJson.mockReset());
  it("读取所有页并保留删除记录", async () => {
    mocks.requestJson
      .mockResolvedValueOnce({ tasks: [task], nextCursor: "page 2" })
      .mockResolvedValueOnce({ tasks: [{ ...task, deletedAt: "2026-11-05T00:00:00Z" }], nextCursor: null });
    const records = await pullDesktopSyncRecords();
    expect(records).toHaveLength(2);
    expect(records[1].deletedAt).toBeTruthy();
    expect(mocks.requestJson).toHaveBeenLastCalledWith("/api/tasks/sync?cursor=page%202", { cache: "no-store" });
  });
  it("后续页失败或游标重复时拒绝部分结果", async () => {
    mocks.requestJson
      .mockResolvedValueOnce({ tasks: [task], nextCursor: "same" })
      .mockRejectedValueOnce(new Error("断网"));
    await expect(pullDesktopSyncRecords()).rejects.toThrow("断网");
    mocks.requestJson.mockResolvedValue({ tasks: [task], nextCursor: "same" });
    await expect(pullDesktopSyncRecords()).rejects.toThrow("游标");
  });
});
