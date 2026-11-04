// @vitest-environment jsdom

import { afterEach, expect, it, vi } from "vitest";
import type { TaskflowDesktopBridge } from "@/shared/lib/desktop/bridge";
import { useTaskStore } from "./task-store";

const remote = vi.hoisted(() => ({ list: vi.fn(), create: vi.fn() }));
vi.mock("@/features/tasks/repositories/remote-task-repository", () => ({ remoteTaskRepository: remote }));
vi.mock("@/shared/lib/appwrite/env", () => ({ hasAppwritePublicEnv: true }));

afterEach(() => {
  delete window.taskflowDesktop;
  useTaskStore.setState({ tasks: [], error: null, lastLoadedUserId: null, isLoading: false });
  vi.clearAllMocks();
});

it("未登录任务写入桌面数据库，重载 Store 后恢复；仅登录不会上传本地任务", async () => {
  const task = {
    id: "persistent-task",
    title: "本地任务",
    description: "",
    status: "todo" as const,
    priority: "medium" as const,
    tags: [],
    createdAt: "2026-11-04T00:00:00Z",
  };
  const list = vi.fn().mockResolvedValue([task]);
  const create = vi.fn().mockResolvedValue(task);
  window.taskflowDesktop = {
    isDesktop: true,
    workspace: { get: vi.fn().mockResolvedValue({ accountId: "local:device", syncEnabled: false }) },
    localTasks: { list, create },
  } as unknown as TaskflowDesktopBridge;

  await useTaskStore.getState().createTaskAsync({ ...task, tags: "", dueDate: "" });
  expect(create).toHaveBeenCalledWith(expect.objectContaining({ accountId: "local:device" }));
  useTaskStore.getState().clearTasks();
  await useTaskStore.getState().syncTasks();
  expect(useTaskStore.getState().tasks[0].id).toBe(task.id);
  await useTaskStore.getState().syncTasks("cloud-account");
  expect(useTaskStore.getState().tasks[0].id).toBe(task.id);
  expect(remote.list).not.toHaveBeenCalled();
  expect(remote.create).not.toHaveBeenCalled();
});
