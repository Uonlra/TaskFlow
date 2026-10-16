// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTaskPage } from "@/features/tasks/hooks/use-task-page";
import { remoteTaskRepository } from "@/features/tasks/repositories/remote-task-repository";
import type { Task, TaskPageInitialData } from "@/features/tasks/types/task.types";
import {
  DEFAULT_TASK_FILTERS as filters,
  getTaskPage,
  type TaskPageResult,
} from "@/features/tasks/utils/task-list-query";

const mocks = vi.hoisted(() => ({
  auth: { user: { id: "user-1" } as { id: string } | null, isLoading: false, isConfigured: true },
  tasks: [] as Task[],
}));
vi.mock("@/features/auth/providers/auth-provider", () => ({ useAuth: () => mocks.auth }));
vi.mock("@/features/tasks/store/task-store", () => ({
  useTaskStore: (selector: (state: { tasks: Task[] }) => unknown) => selector({ tasks: mocks.tasks }),
}));

const task: Task = {
  id: "one",
  title: "初始任务",
  description: "",
  status: "todo",
  priority: "medium",
  tags: [],
  createdAt: "2026-10-15T08:00:00Z",
};
const initialData: TaskPageInitialData = { userId: "user-1", ...getTaskPage([task], filters) };
const options = { filters, page: 1, initialFilters: filters, initialData };

beforeEach(() => {
  mocks.auth.user = { id: "user-1" };
  mocks.auth.isLoading = false;
  mocks.tasks = [];
});
afterEach(() => vi.restoreAllMocks());

describe("useTaskPage", () => {
  it("shows matching SSR data while checking auth, then reuses it without a request", () => {
    const query = vi.spyOn(remoteTaskRepository, "listPage");
    mocks.auth.user = null;
    mocks.auth.isLoading = true;
    const { result, rerender } = renderHook(() => useTaskPage(options));
    expect(result.current.pageData?.tasks).toEqual([task]);
    expect(result.current.isLoading).toBe(false);
    mocks.auth.user = { id: "user-1" };
    mocks.auth.isLoading = false;
    rerender();
    expect(query).not.toHaveBeenCalled();
  });

  it("never reapplies stale SSR props after a successful refresh", async () => {
    const updated = { ...task, title: "已更新任务" };
    const query = vi.spyOn(remoteTaskRepository, "listPage").mockResolvedValue(getTaskPage([updated], filters));
    const { result, rerender } = renderHook((props) => useTaskPage(props), { initialProps: options });
    await act(async () => {
      expect(await result.current.reload()).toBe(true);
    });
    rerender({ ...options, initialData: { ...initialData } });
    expect(result.current.pageData?.tasks).toEqual([updated]);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it("isolates account data immediately and ignores the previous account's late response", async () => {
    const oldRequest = deferred<TaskPageResult>();
    const nextRequest = deferred<TaskPageResult>();
    const query = vi
      .spyOn(remoteTaskRepository, "listPage")
      .mockReturnValueOnce(oldRequest.promise)
      .mockReturnValueOnce(nextRequest.promise);
    const { result, rerender } = renderHook(() => useTaskPage({ ...options, initialData: null }));
    mocks.auth.user = { id: "user-2" };
    rerender();
    expect(result.current.pageData).toBeNull();
    expect(query.mock.calls[0][2]?.signal?.aborted).toBe(true);
    const current = { ...task, id: "two" };
    await act(async () => nextRequest.resolve(getTaskPage([current], filters)));
    await act(async () => oldRequest.resolve(initialData));
    expect(result.current.pageData?.tasks).toEqual([current]);
  });

  it("cancels a superseded page request and ignores its late result", async () => {
    const second = deferred<TaskPageResult>();
    const third = deferred<TaskPageResult>();
    const query = vi
      .spyOn(remoteTaskRepository, "listPage")
      .mockReturnValueOnce(second.promise)
      .mockReturnValueOnce(third.promise);
    const { result, rerender } = renderHook((props) => useTaskPage(props), { initialProps: options });
    rerender({ ...options, page: 2 });
    rerender({ ...options, page: 3 });
    expect(query.mock.calls.map((call) => call[1])).toEqual([2, 3]);
    expect(query.mock.calls[0][2]?.signal?.aborted).toBe(true);
    await act(async () => third.resolve({ ...initialData, page: 3 }));
    await act(async () => second.resolve({ ...initialData, page: 2 }));
    expect(result.current.pageData?.page).toBe(3);
  });

  it("retains current data when refresh fails and reports failure without throwing", async () => {
    vi.spyOn(remoteTaskRepository, "listPage").mockRejectedValue(new Error("服务暂时不可用"));
    const { result } = renderHook(() => useTaskPage(options));
    await act(async () => expect(await result.current.reload()).toBe(false));
    expect(result.current.pageData?.tasks).toEqual([task]);
    expect(result.current.error).toBe("服务暂时不可用");
    expect(result.current.isLoading).toBe(false);
  });

  it("does not refresh an old page when a previously started mutation completes", async () => {
    const query = vi.spyOn(remoteTaskRepository, "listPage").mockResolvedValue({ ...initialData, page: 2 });
    const { result, rerender } = renderHook((props) => useTaskPage(props), { initialProps: options });
    const oldReload = result.current.reload;
    rerender({ ...options, page: 2 });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => expect(await oldReload()).toBe(false));
    expect(query).toHaveBeenCalledTimes(1);
  });

  it("derives guest pagination from the Store and clamps the last page after deletion", () => {
    const query = vi.spyOn(remoteTaskRepository, "listPage");
    mocks.auth.user = null;
    mocks.tasks = Array.from({ length: 51 }, (_, i) => ({ ...task, id: String(i) }));
    const { result, rerender } = renderHook(() => useTaskPage({ ...options, page: 2 }));
    expect(result.current.pageData?.tasks).toHaveLength(1);
    expect(result.current.pageData?.page).toBe(2);
    mocks.tasks = mocks.tasks.slice(0, 50);
    rerender();
    expect(result.current.pageData?.page).toBe(1);
    expect(result.current.pageData?.tasks).toHaveLength(50);
    expect(result.current.isLoading).toBe(false);
    expect(query).not.toHaveBeenCalled();
  });
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}
