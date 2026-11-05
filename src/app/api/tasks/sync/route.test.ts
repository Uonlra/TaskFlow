import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAppwriteSessionSecret: vi.fn(),
  getCurrentAuthEnvelope: vi.fn(),
  createTask: vi.fn(),
  deleteTask: vi.fn(),
  getTask: vi.fn(),
  updateTask: vi.fn(),
  listSyncTasksPage: vi.fn(),
  AppwriteRequestError: class MockAppwriteRequestError extends Error {
    status: number;

    constructor(status: number, message = "Appwrite error") {
      super(message);
      this.status = status;
    }
  },
}));

vi.mock("@/shared/lib/appwrite/session", () => ({
  getAppwriteSessionSecret: mocks.getAppwriteSessionSecret,
}));

vi.mock("@/shared/lib/appwrite/server", () => ({
  AppwriteRequestError: mocks.AppwriteRequestError,
  getCurrentAuthEnvelope: mocks.getCurrentAuthEnvelope,
}));

vi.mock("@/shared/lib/appwrite/tasks", () => ({
  createTask: mocks.createTask,
  deleteTask: mocks.deleteTask,
  getTask: mocks.getTask,
  updateTask: mocks.updateTask,
  listSyncTasksPage: mocks.listSyncTasksPage,
}));

import { POST, GET } from "@/app/api/tasks/sync/route";

const authEnvelope = {
  user: {
    id: "user-1",
    email: "demo@example.com",
    name: "测试用户",
    emailVerified: true,
  },
};

function requestFor(operations: unknown) {
  return new NextRequest("http://localhost/api/tasks/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ operations }),
  });
}

function upsertOperation(overrides: Record<string, unknown> = {}) {
  return {
    operationId: "operation-1",
    accountId: "user-1",
    taskId: "task-1",
    operation: "upsert",
    clientUpdatedAt: "2026-10-30T09:00:00.000Z",
    payload: {
      id: "task-1",
      title: "离线任务",
      description: "描述",
      status: "todo",
      priority: "high",
      tags: ["工作"],
      dueDate: "2026-10-31",
    },
    ...overrides,
  };
}

describe("/api/tasks/sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAppwriteSessionSecret.mockResolvedValue("session-secret");
    mocks.getCurrentAuthEnvelope.mockResolvedValue(authEnvelope);
  });

  it("未登录时返回 401", async () => {
    mocks.getAppwriteSessionSecret.mockResolvedValue(null);
    mocks.getCurrentAuthEnvelope.mockResolvedValue(null);

    const response = await POST(requestFor([upsertOperation()]));

    expect(response.status).toBe(401);
  });

  it("同步下载需要认证，按游标返回包含删除标记的页", async () => {
    mocks.listSyncTasksPage.mockResolvedValue({
      tasks: [{ id: "gone", deletedAt: "2026-11-05T00:00:00Z" }],
      nextCursor: null,
    });
    const response = await GET(new NextRequest("http://localhost/api/tasks/sync?cursor=last"));
    expect((await response.json()).tasks[0].deletedAt).toBeTruthy();
    expect(mocks.listSyncTasksPage).toHaveBeenCalledWith("session-secret", expect.any(NextRequest), "last");
    mocks.getCurrentAuthEnvelope.mockResolvedValue(null);
    expect((await GET(new NextRequest("http://localhost/api/tasks/sync"))).status).toBe(401);
  });

  it("删除记录阻止旧编辑复活，但允许较新的完整编辑恢复", async () => {
    const tombstone = {
      id: "task-1",
      title: "已删除",
      updatedAt: "2026-10-30T10:00:00Z",
      syncClientUpdatedAt: "2026-10-30T10:00:00Z",
      deletedAt: "2026-10-30T10:00:00Z",
    };
    mocks.getTask.mockResolvedValue(tombstone);
    expect((await (await POST(requestFor([upsertOperation()]))).json()).results[0]).toMatchObject({
      status: "stale",
      task: { deletedAt: tombstone.deletedAt },
    });
    expect(mocks.updateTask).not.toHaveBeenCalled();
    mocks.updateTask.mockResolvedValue({ id: "task-1", title: "恢复后的编辑" });
    expect(
      (await (await POST(requestFor([upsertOperation({ clientUpdatedAt: "2026-10-30T11:00:00Z" })]))).json()).results[0]
        .status,
    ).toBe("applied");
  });

  it("拒绝不属于当前账户的同步操作", async () => {
    const response = await POST(requestFor([upsertOperation({ accountId: "other-user" })]));

    expect(response.status).toBe(403);
    expect(mocks.getTask).not.toHaveBeenCalled();
  });

  it("远端不存在时使用本地任务 ID 创建任务", async () => {
    mocks.getTask.mockRejectedValue(new mocks.AppwriteRequestError(404));
    mocks.createTask.mockResolvedValue({ id: "task-1", title: "离线任务", updatedAt: "2026-10-30T09:01:00.000Z" });

    const response = await POST(requestFor([upsertOperation()]));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      results: [
        {
          operationId: "operation-1",
          taskId: "task-1",
          status: "applied",
          task: { id: "task-1", title: "离线任务", updatedAt: "2026-10-30T09:01:00.000Z" },
        },
      ],
    });
    expect(mocks.createTask).toHaveBeenCalledWith(
      "session-secret",
      "user-1",
      expect.objectContaining({ tags: "工作" }),
      expect.any(NextRequest),
      "task-1",
      "2026-10-30T09:00:00.000Z",
    );
  });

  it("远端更新时间更新时跳过旧的本地操作", async () => {
    const remoteTask = {
      id: "task-1",
      title: "远端版本",
      description: "",
      status: "todo",
      priority: "medium",
      tags: [],
      createdAt: "2026-10-29T09:00:00.000Z",
      updatedAt: "2026-10-30T10:00:00.000Z",
    };
    mocks.getTask.mockResolvedValue(remoteTask);

    const response = await POST(requestFor([upsertOperation()]));

    await expect(response.json()).resolves.toEqual({
      results: [{ operationId: "operation-1", taskId: "task-1", status: "stale", task: remoteTask }],
    });
    expect(mocks.updateTask).not.toHaveBeenCalled();
  });

  it("远端不存在时创建删除记录，防止旧离线编辑复活任务", async () => {
    mocks.getTask.mockRejectedValue(new mocks.AppwriteRequestError(404));
    mocks.createTask.mockResolvedValue({ id: "task-2", deletedAt: "2026-10-30T09:00:00.000Z" });

    const response = await POST(
      requestFor([
        {
          operationId: "operation-2",
          accountId: "user-1",
          taskId: "task-2",
          operation: "delete",
          clientUpdatedAt: "2026-10-30T09:00:00.000Z",
          payload: { id: "task-2", deletedAt: "2026-10-30T09:00:00.000Z" },
        },
      ]),
    );

    await expect(response.json()).resolves.toEqual({
      results: [
        {
          operationId: "operation-2",
          taskId: "task-2",
          status: "deleted",
          task: { id: "task-2", deletedAt: "2026-10-30T09:00:00.000Z" },
        },
      ],
    });
    expect(mocks.deleteTask).not.toHaveBeenCalled();
  });

  it("远端物理更新时间较晚但逻辑编辑时间较旧时应用新操作", async () => {
    mocks.getTask.mockResolvedValue({
      id: "task-1",
      title: "上次回放",
      updatedAt: "2026-10-30T10:00:00.000Z",
      syncClientUpdatedAt: "2026-10-30T08:00:00.000Z",
    });
    mocks.updateTask.mockResolvedValue({ id: "task-1", title: "离线任务" });

    const response = await POST(requestFor([upsertOperation()]));

    expect((await response.json()).results[0].status).toBe("applied");
    expect(mocks.updateTask).toHaveBeenCalledWith(
      "session-secret",
      "task-1",
      expect.any(Object),
      expect.any(NextRequest),
      "2026-10-30T09:00:00.000Z",
    );
  });
});
