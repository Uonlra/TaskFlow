// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDashboardSummary } from "@/features/dashboard/hooks/use-dashboard-summary";
import { dashboardRepository } from "@/features/dashboard/repositories/dashboard-repository";
import type { DashboardSummary, DashboardSummaryQuery } from "@/features/dashboard/types/dashboard-query";
import type { Task } from "@/features/tasks/types/task.types";
import { buildDashboardStats } from "@/features/tasks/utils/task-analytics";

const mocks = vi.hoisted(() => ({
  auth: { user: { id: "user-1" } as { id: string } | null, isLoading: false, isConfigured: true },
  tasks: [] as Task[],
}));
vi.mock("@/features/auth/providers/auth-provider", () => ({ useAuth: () => mocks.auth }));
vi.mock("@/features/tasks/store/task-store", () => ({
  useTaskStore: (selector: (state: { tasks: Task[] }) => unknown) => selector({ tasks: mocks.tasks }),
}));
const query: DashboardSummaryQuery = { range: "all", status: "all", priority: "all", due: "" };
const task: Task = {
  id: "one",
  title: "测试任务",
  description: "",
  status: "todo",
  priority: "medium",
  tags: [],
  createdAt: "2026-10-15T08:00:00Z",
};
const summary = (tasks: Task[] = [task]): DashboardSummary => ({
  stats: buildDashboardStats(tasks, { range: "all" }),
  hasAnyTasks: tasks.length > 0,
});

beforeEach(() => {
  mocks.auth.user = { id: "user-1" };
  mocks.auth.isLoading = false;
  mocks.tasks = [];
});
afterEach(() => vi.restoreAllMocks());

describe("useDashboardSummary", () => {
  it("cancels changed filters and only accepts the latest summary", async () => {
    const first = deferred<DashboardSummary>();
    const latest = deferred<DashboardSummary>();
    const getSummary = vi
      .spyOn(dashboardRepository, "getSummary")
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(latest.promise);
    const { result, rerender } = renderHook((props) => useDashboardSummary(props), { initialProps: query });
    rerender({ ...query, priority: "high" });
    expect(getSummary.mock.calls[0][1]?.signal?.aborted).toBe(true);
    await act(async () => latest.resolve(summary([])));
    await act(async () => first.resolve(summary()));
    expect(result.current.stats.totalCount).toBe(0);
    expect(result.current.hasAnyTasks).toBe(false);
  });

  it("hides the previous account's summary during account switching", async () => {
    const pending = deferred<DashboardSummary>();
    vi.spyOn(dashboardRepository, "getSummary").mockResolvedValueOnce(summary()).mockReturnValueOnce(pending.promise);
    const { result, rerender } = renderHook(() => useDashboardSummary(query));
    await waitFor(() => expect(result.current.stats.totalCount).toBe(1));
    mocks.auth.user = { id: "user-2" };
    rerender();
    expect(result.current.stats.totalCount).toBe(0);
    expect(result.current.hasPreviousData).toBe(false);
    expect(result.current.isLoading).toBe(true);
    await act(async () => pending.resolve(summary([])));
    expect(result.current.isLoading).toBe(false);
  });

  it("retains a loaded summary after refresh failure and recovers on retry", async () => {
    vi.spyOn(dashboardRepository, "getSummary")
      .mockResolvedValueOnce(summary())
      .mockRejectedValueOnce(new Error("暂时不可用"))
      .mockResolvedValueOnce(summary([]));
    const { result } = renderHook(() => useDashboardSummary(query));
    await waitFor(() => expect(result.current.stats.totalCount).toBe(1));
    await act(async () => expect(await result.current.reload()).toBe(false));
    expect(result.current.stats.totalCount).toBe(1);
    expect(result.current.error).toBe("暂时不可用");
    await act(async () => expect(await result.current.reload()).toBe(true));
    expect(result.current.error).toBeNull();
    expect(result.current.stats.totalCount).toBe(0);
  });

  it("does not let a refresh captured under an old range interrupt the current range", async () => {
    const getSummary = vi.spyOn(dashboardRepository, "getSummary").mockResolvedValue(summary());
    const { result, rerender } = renderHook((props) => useDashboardSummary(props), { initialProps: query });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const oldReload = result.current.reload;
    rerender({ ...query, range: "week" });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => expect(await oldReload()).toBe(false));
    expect(getSummary).toHaveBeenCalledTimes(2);
  });

  it("derives guest focus filters from Store data while leaving summary metrics intact", () => {
    const getSummary = vi.spyOn(dashboardRepository, "getSummary");
    mocks.auth.user = null;
    mocks.tasks = [task, { ...task, id: "done", status: "done", priority: "high" }];
    const { result, rerender } = renderHook((props) => useDashboardSummary(props), { initialProps: query });
    expect(result.current.stats.focusTasks.map((item) => item.id)).toEqual(["one"]);
    rerender({ ...query, status: "done", priority: "high" });
    expect(result.current.stats.focusTasks.map((item) => item.id)).toEqual(["done"]);
    expect(result.current.stats.totalCount).toBe(2);
    mocks.tasks = [];
    rerender({ ...query, status: "done", priority: "high" });
    expect(result.current.hasAnyTasks).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(getSummary).not.toHaveBeenCalled();
  });

  it("waits for auth and cancels outstanding work on unmount", async () => {
    mocks.auth.isLoading = true;
    const pending = deferred<DashboardSummary>();
    const getSummary = vi.spyOn(dashboardRepository, "getSummary").mockReturnValue(pending.promise);
    const { result, rerender, unmount } = renderHook(() => useDashboardSummary(query));
    expect(result.current.isLoading).toBe(true);
    expect(getSummary).not.toHaveBeenCalled();
    mocks.auth.isLoading = false;
    rerender();
    const signal = getSummary.mock.calls[0][1]?.signal;
    unmount();
    expect(signal?.aborted).toBe(true);
    await act(async () => pending.resolve(summary()));
  });
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}
