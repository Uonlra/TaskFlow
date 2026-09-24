// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";

import type { Task } from "@/features/tasks/types/task.types";
import type { TaskFormValues } from "@/features/tasks/schemas/task-schema";
import { GUEST_TASKS_STORAGE_KEY, useTaskStore } from "@/features/tasks/store/task-store";

const repositoryMocks = vi.hoisted(() => ({
  list: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  updateStatus: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("@/features/tasks/repositories/remote-task-repository", () => ({
  remoteTaskRepository: repositoryMocks,
}));

vi.mock("@/shared/lib/appwrite/env", () => ({
  hasAppwritePublicEnv: true,
}));

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: "task-1",
  title: "测试任务",
  description: "测试说明",
  status: "todo",
  priority: "medium",
  tags: [],
  createdAt: "2026-08-01T10:00:00.000Z",
  updatedAt: "2026-08-01T10:00:00.000Z",
  ...overrides,
});

const formValues: TaskFormValues = {
  title: "新任务",
  description: "新任务说明",
  status: "todo",
  priority: "high",
  tags: "测试，学习",
  dueDate: "",
};

afterEach(() => {
  window.sessionStorage.removeItem(GUEST_TASKS_STORAGE_KEY);
  useTaskStore.setState({
    tasks: [],
    isLoading: false,
    error: null,
    lastLoadedUserId: null,
  });

  vi.clearAllMocks();
});

describe("task store", () => {
  it("initializeTasks 写入服务端预取数据并规范化 tags", () => {
    useTaskStore.getState().initializeTasks(
      [
        makeTask({
          id: "prefetched-task",
          tags: null as unknown as string[],
        }),
      ],
      "user-1",
    );

    expect(useTaskStore.getState()).toEqual(
      expect.objectContaining({
        tasks: [expect.objectContaining({ id: "prefetched-task", tags: [] })],
        isLoading: false,
        error: null,
        lastLoadedUserId: "user-1",
      }),
    );
  });

  it("initializeTasks 不覆盖同一用户已经更新的客户端数据", () => {
    const clientTask = makeTask({ id: "client-task", title: "客户端已更新" });
    useTaskStore.setState({
      tasks: [clientTask],
      lastLoadedUserId: "user-1",
    });

    useTaskStore.getState().initializeTasks([makeTask({ id: "stale-prefetched-task" })], "user-1");

    expect(useTaskStore.getState().tasks).toEqual([clientTask]);
  });

  it("syncTasks 获取任务后写入 store，并规范化 tags", async () => {
    repositoryMocks.list.mockResolvedValue([
      makeTask({
        id: "remote-task",
        tags: null as unknown as string[],
      }),
    ]);

    await useTaskStore.getState().syncTasks("user-1");

    const state = useTaskStore.getState();

    expect(state.tasks).toEqual([
      expect.objectContaining({
        id: "remote-task",
        tags: [],
      }),
    ]);
    expect(state.lastLoadedUserId).toBe("user-1");
    expect(state.isLoading).toBe(false);
  });

  it("createTaskAsync 创建任务后将任务放到 store 开头", async () => {
    const createdTask = makeTask({
      id: "created-task",
      title: "新任务",
      tags: ["测试", "学习"],
    });

    repositoryMocks.create.mockResolvedValue(createdTask);

    const taskId = await useTaskStore.getState().createTaskAsync(formValues, "user-1");

    expect(taskId).toBe("created-task");
    expect(repositoryMocks.create).toHaveBeenCalledWith(formValues);
    expect(useTaskStore.getState().tasks[0]).toEqual(createdTask);
  });

  it("deleteTask 删除远程任务后从 store 移除", async () => {
    useTaskStore.setState({
      tasks: [makeTask({ id: "task-to-delete" }), makeTask({ id: "task-to-keep" })],
    });

    repositoryMocks.delete.mockResolvedValue(undefined);

    await useTaskStore.getState().deleteTask("task-to-delete", "user-1");

    expect(repositoryMocks.delete).toHaveBeenCalledWith("task-to-delete");

    expect(useTaskStore.getState().tasks).toEqual([
      expect.objectContaining({
        id: "task-to-keep",
      }),
    ]);
  });

  it("updateTaskStatus 更新任务状态并发送 PATCH 请求", async () => {
    const updatedTask = makeTask({
      id: "task-to-update",
      status: "done",
      completedAt: "2026-08-14T10:00:00.000Z",
    });

    useTaskStore.setState({
      tasks: [makeTask({ id: "task-to-update" })],
    });

    repositoryMocks.updateStatus.mockResolvedValue(updatedTask);

    await useTaskStore.getState().updateTaskStatus("task-to-update", "done", "user-1");

    expect(repositoryMocks.updateStatus).toHaveBeenCalledWith("task-to-update", "done");

    expect(useTaskStore.getState().tasks[0]).toEqual(updatedTask);
  });

  it("syncTasks 请求失败时保存错误并结束加载状态", async () => {
    repositoryMocks.list.mockRejectedValue(new Error("网络暂时不可用"));

    await useTaskStore.getState().syncTasks("user-1");

    const state = useTaskStore.getState();

    expect(state.error).toBe("网络暂时不可用");
    expect(state.isLoading).toBe(false);
  });

  it("API 返回错误响应时抛出服务端错误信息", async () => {
    repositoryMocks.create.mockRejectedValue(new Error("任务保存失败。"));

    await expect(useTaskStore.getState().createTaskAsync(formValues, "user-1")).rejects.toThrow("任务保存失败。");

    expect(useTaskStore.getState().tasks).toEqual([]);
  });

  it("updateTask 编辑任务后替换 store 中的旧任务", async () => {
    const updatedTask = makeTask({
      id: "task-to-update",
      title: "更新后的任务",
      description: "更新后的说明",
      priority: "high",
    });

    useTaskStore.setState({
      tasks: [makeTask({ id: "task-to-update" })],
    });

    repositoryMocks.update.mockResolvedValue(updatedTask);

    await useTaskStore.getState().updateTask("task-to-update", formValues, "user-1");

    expect(repositoryMocks.update).toHaveBeenCalledWith("task-to-update", formValues);
    expect(useTaskStore.getState().tasks).toEqual([updatedTask]);
  });

  it("没有用户时同步会清空 store 且不请求 API", async () => {
    useTaskStore.setState({
      tasks: [makeTask()],
      lastLoadedUserId: "old-user",
    });
    await useTaskStore.getState().syncTasks();

    expect(repositoryMocks.list).not.toHaveBeenCalled();
    expect(useTaskStore.getState().tasks).toEqual([]);
    expect(useTaskStore.getState().lastLoadedUserId).toBeNull();
  });

  it("未登录创建任务时写入当前标签页且不请求 API", async () => {
    const taskId = await useTaskStore.getState().createTaskAsync(formValues);

    expect(taskId).toBe(useTaskStore.getState().tasks[0]?.id);
    expect(useTaskStore.getState().tasks[0]).toEqual(
      expect.objectContaining({ title: "新任务", tags: ["测试", "学习"] }),
    );
    expect(window.sessionStorage.getItem(GUEST_TASKS_STORAGE_KEY)).toContain("新任务");
    expect(repositoryMocks.create).not.toHaveBeenCalled();
  });
});
