import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET, POST } from "@/app/api/tasks/route";

const mocks = vi.hoisted(() => ({
  getAppwriteSessionSecret: vi.fn(),
  getCurrentAuthEnvelope: vi.fn(),
  listTasks: vi.fn(),
  listTasksPage: vi.fn(),
  canUseAppwriteTaskPage: vi.fn(),
  createTask: vi.fn(),
}));

vi.mock("@/shared/lib/appwrite/session", () => ({
  getAppwriteSessionSecret: mocks.getAppwriteSessionSecret,
}));

vi.mock("@/shared/lib/appwrite/server", () => ({
  AppwriteRequestError: class AppwriteRequestError extends Error {},
  getCurrentAuthEnvelope: mocks.getCurrentAuthEnvelope,
}));

vi.mock("@/shared/lib/appwrite/tasks", () => ({
  listTasks: mocks.listTasks,
  listTasksPage: mocks.listTasksPage,
  canUseAppwriteTaskPage: mocks.canUseAppwriteTaskPage,
  createTask: mocks.createTask,
}));

const authEnvelope = {
  user: {
    id: "user-1",
    email: "demo@example.com",
    name: "测试用户",
    emailVerified: true,
  },
};

describe("/api/tasks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.canUseAppwriteTaskPage.mockReturnValue(true);
  });

  it("GET 未登录时返回 401", async () => {
    mocks.getAppwriteSessionSecret.mockResolvedValue(null);
    mocks.getCurrentAuthEnvelope.mockResolvedValue(null);
    const request = new NextRequest("http://localhost/api/tasks");

    const response = await GET(request);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      message: "请先登录后再查看任务。",
    });
    expect(mocks.listTasks).not.toHaveBeenCalled();
  });

  it("POST 任务格式无效时返回 400", async () => {
    mocks.getAppwriteSessionSecret.mockResolvedValue("session-secret");
    mocks.getCurrentAuthEnvelope.mockResolvedValue(authEnvelope);
    const request = new NextRequest("http://localhost/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect((await response.json()).message).toBeTruthy();
    expect(mocks.createTask).not.toHaveBeenCalled();
  });

  it("POST 登录用户提交有效任务时返回 201", async () => {
    mocks.getAppwriteSessionSecret.mockResolvedValue("session-secret");
    mocks.getCurrentAuthEnvelope.mockResolvedValue(authEnvelope);
    const input = {
      title: "API 测试任务",
      description: "验证任务 Route Handler",
      status: "todo",
      priority: "high",
      tags: "测试",
      dueDate: "",
    };
    const createdTask = {
      id: "task-1",
      ...input,
      tags: ["测试"],
      createdAt: "2026-08-14T10:00:00.000Z",
    };
    mocks.createTask.mockResolvedValue(createdTask);
    const request = new NextRequest("http://localhost/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    const response = await POST(request);

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ task: createdTask });
    expect(mocks.createTask).toHaveBeenCalledWith("session-secret", "user-1", input, request);
  });

  it("GET 带页码时使用 Appwrite 分页结果", async () => {
    mocks.getAppwriteSessionSecret.mockResolvedValue("session-secret");
    mocks.getCurrentAuthEnvelope.mockResolvedValue(authEnvelope);
    mocks.listTasksPage.mockResolvedValue({
      tasks: [{ id: "todo-1" }],
      total: 1,
      page: 1,
      pageSize: 1,
      hasNext: false,
      categoryCounts: { all: 2, active: 1, done: 1, near: 0 },
    });

    const request = new NextRequest("http://localhost/api/tasks?status=active&page=1&limit=1");
    const response = await GET(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      tasks: [{ id: "todo-1" }],
      total: 1,
      page: 1,
      pageSize: 1,
      hasNext: false,
      categoryCounts: { all: 2, active: 1, done: 1 },
    });
    expect(mocks.listTasksPage).toHaveBeenCalledWith(
      "session-secret",
      expect.objectContaining({ status: "active" }),
      1,
      1,
      request,
    );
    expect(mocks.listTasks).not.toHaveBeenCalled();
  });

  it("无法安全下沉的标签筛选保留内存回退", async () => {
    mocks.canUseAppwriteTaskPage.mockReturnValue(false);
    mocks.listTasks.mockResolvedValue([
      { id: "tagged-1", title: "带标签", description: "", status: "todo", priority: "low", tags: ["工作"], createdAt: "2026-08-01" },
      { id: "other-1", title: "其他", description: "", status: "todo", priority: "low", tags: [], createdAt: "2026-08-02" },
    ]);

    const request = new NextRequest("http://localhost/api/tasks?tag=工作&page=1&limit=10");
    const response = await GET(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ tasks: [{ id: "tagged-1" }], total: 1 });
    expect(mocks.listTasksPage).not.toHaveBeenCalled();
  });
});
