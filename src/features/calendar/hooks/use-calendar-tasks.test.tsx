// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useCalendarTasks } from "@/features/calendar/hooks/use-calendar-tasks";
import { remoteTaskRepository } from "@/features/tasks/repositories/remote-task-repository";
import { GUEST_TASKS_STORAGE_KEY, useTaskStore } from "@/features/tasks/store/task-store";
import type { TaskDueRangeResult } from "@/features/tasks/types/task-query";
import type { Task } from "@/features/tasks/types/task.types";

const auth = vi.hoisted(() => ({ user: null as { id: string } | null, isConfigured: true, isLoading: false }));
vi.mock("@/features/auth/providers/auth-provider", () => ({ useAuth: () => auth }));
vi.mock("@/shared/lib/appwrite/env", () => ({ hasAppwritePublicEnv: true }));

const range = { from: "2026-09-28", to: "2026-11-09" };
const nextRange = { from: "2026-10-26", to: "2026-12-07" };
const task: Task = {
  id: "task-1",
  title: "校对日历",
  description: "",
  status: "todo",
  priority: "medium",
  tags: [],
  dueDate: "2026-10-15",
  createdAt: "2026-10-01T08:00:00Z",
};
const values = {
  title: "更新任务",
  description: "",
  status: "todo" as const,
  priority: "high" as const,
  tags: "测试",
  dueDate: "2026-10-15",
};
const data = (tasks: Task[] = [task]): TaskDueRangeResult => ({
  tasks,
  hasAnyTasks: tasks.length > 0,
  attention: { overdueCount: 2, nearDueCount: 3 },
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

beforeEach(() => {
  auth.user = null;
  auth.isLoading = false;
  auth.isConfigured = true;
  useTaskStore.setState({ tasks: [], isLoading: false, error: null, lastLoadedUserId: null });
});

afterEach(() => {
  vi.restoreAllMocks();
  window.sessionStorage.removeItem(GUEST_TASKS_STORAGE_KEY);
});

describe("useCalendarTasks", () => {
  it("直接派生访客任务和提醒，响应其他页面的 Store 更新，且不发出请求", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 15, 12));
    try {
      const fetch = vi.spyOn(global, "fetch");
      useTaskStore.setState({ tasks: [task, { ...task, id: "old", dueDate: "2026-10-13" }] });
      const { result } = renderHook(() => useCalendarTasks(range));
      expect(result.current.attention).toEqual({ overdueCount: 1, nearDueCount: 1 });
      expect(result.current.isLoading).toBe(false);
      act(() => useTaskStore.setState({ tasks: [{ ...task, status: "done" }] }));
      expect(result.current.tasks[0].status).toBe("done");
      expect(result.current.attention).toEqual({ overdueCount: 0, nearDueCount: 0 });
      expect(fetch).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("访客的创建、编辑、完成和删除统一写入 Store 与会话存储", async () => {
    const fetch = vi.spyOn(global, "fetch");
    const { result } = renderHook(() => useCalendarTasks(range));
    await act(async () => {
      expect(await result.current.createTask(values)).toBe(true);
    });
    const id = result.current.tasks[0].id;
    await act(async () => {
      await result.current.updateTask(id, { ...values, title: "修改后" });
    });
    expect(result.current.tasks[0].title).toBe("修改后");
    await act(async () => {
      await result.current.updateTaskStatus(id, "done");
    });
    expect(JSON.parse(sessionStorage.getItem(GUEST_TASKS_STORAGE_KEY)!)[0].status).toBe("done");
    await act(async () => {
      await result.current.deleteTask(id);
    });
    expect(result.current.hasAnyTasks).toBe(false);
    expect(result.current.tasks).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("认证未完成时等待，完成后按日期范围查询账户数据", async () => {
    auth.isLoading = true;
    const query = vi.spyOn(remoteTaskRepository, "listByDueRange").mockResolvedValue(data());
    const { result, rerender } = renderHook(() => useCalendarTasks(range));
    expect(result.current.isLoading).toBe(true);
    expect(query).not.toHaveBeenCalled();
    auth.isLoading = false;
    auth.user = { id: "user-1" };
    rerender();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(query).toHaveBeenCalledWith(range, { signal: expect.any(AbortSignal) });
    expect(result.current.tasks).toEqual([task]);
    expect(result.current.attention).toEqual(data().attention);
  });

  it("切换月份取消旧请求，并忽略未遵守取消信号的迟到响应", async () => {
    auth.user = { id: "user-1" };
    const old = deferred<TaskDueRangeResult>();
    const latest = deferred<TaskDueRangeResult>();
    const query = vi
      .spyOn(remoteTaskRepository, "listByDueRange")
      .mockReturnValueOnce(old.promise)
      .mockReturnValueOnce(latest.promise);
    const { result, rerender } = renderHook((props) => useCalendarTasks(props), { initialProps: range });
    const signal = query.mock.calls[0][1]!.signal!;
    rerender(nextRange);
    expect(signal.aborted).toBe(true);
    expect(result.current.tasks).toEqual([]);
    await act(async () => {
      latest.resolve(data([{ ...task, id: "latest" }]));
    });
    await act(async () => {
      old.resolve(data());
    });
    expect(result.current.tasks[0].id).toBe("latest");
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("切换账户立即隐藏上一账户结果；卸载时取消当前请求", async () => {
    auth.user = { id: "user-1" };
    const waiting = deferred<TaskDueRangeResult>();
    const query = vi
      .spyOn(remoteTaskRepository, "listByDueRange")
      .mockResolvedValueOnce(data())
      .mockReturnValueOnce(waiting.promise);
    const { result, rerender, unmount } = renderHook(() => useCalendarTasks(range));
    await waitFor(() => expect(result.current.tasks).toEqual([task]));
    auth.user = { id: "user-2" };
    rerender();
    expect(result.current.tasks).toEqual([]);
    expect(result.current.isLoading).toBe(true);
    const signal = query.mock.calls[1][1]!.signal!;
    unmount();
    expect(signal.aborted).toBe(true);
    await act(async () => {
      waiting.resolve(data());
    });
  });

  it("加载失败显示错误并支持重试", async () => {
    auth.user = { id: "user-1" };
    vi.spyOn(remoteTaskRepository, "listByDueRange")
      .mockRejectedValueOnce(new Error("网络不可用"))
      .mockResolvedValueOnce(data());
    const { result } = renderHook(() => useCalendarTasks(range));
    await waitFor(() => expect(result.current.error).toBe("网络不可用"));
    await act(async () => {
      expect(await result.current.reload()).toBe(true);
    });
    expect(result.current.error).toBeNull();
    expect(result.current.tasks).toEqual([task]);
  });

  it("账户操作同步 Store，再刷新日历；刷新失败与保存失败分别返回", async () => {
    auth.user = { id: "user-1" };
    useTaskStore.setState({ tasks: [task], lastLoadedUserId: "user-1" });
    const query = vi.spyOn(remoteTaskRepository, "listByDueRange").mockResolvedValue(data());
    const update = vi.spyOn(remoteTaskRepository, "update").mockResolvedValue({ ...task, title: "更新任务" });
    const { result } = renderHook(() => useCalendarTasks(range));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    query.mockRejectedValueOnce(new Error("刷新失败"));
    await act(async () => {
      expect(await result.current.updateTask(task.id, values)).toBe(false);
    });
    expect(useTaskStore.getState().tasks[0].title).toBe("更新任务");
    expect(result.current.error).toBe("刷新失败");
    update.mockRejectedValueOnce(new Error("保存失败"));
    await act(async () => {
      await expect(result.current.updateTask(task.id, values)).rejects.toThrow("保存失败");
    });
    expect(query).toHaveBeenCalledTimes(2);
  });

  it("月份切换期间完成的保存，不会取消新月份查询或重新加载旧月份", async () => {
    auth.user = { id: "user-1" };
    const save = deferred<Task>();
    const next = deferred<TaskDueRangeResult>();
    const query = vi
      .spyOn(remoteTaskRepository, "listByDueRange")
      .mockResolvedValueOnce(data())
      .mockReturnValueOnce(next.promise);
    vi.spyOn(remoteTaskRepository, "create").mockReturnValueOnce(save.promise);
    const { result, rerender } = renderHook((props) => useCalendarTasks(props), { initialProps: range });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    let mutation!: Promise<boolean>;
    act(() => {
      mutation = result.current.createTask(values);
    });
    rerender(nextRange);
    const signal = query.mock.calls[1][1]!.signal!;
    await act(async () => {
      save.resolve(task);
      await mutation;
    });
    expect(signal.aborted).toBe(false);
    expect(query).toHaveBeenCalledTimes(2);
    await act(async () => {
      next.resolve(data([{ ...task, id: "new-month" }]));
    });
    expect(result.current.tasks[0].id).toBe("new-month");
  });
});
