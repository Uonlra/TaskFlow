// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";

import { RemoteTaskRepository } from "@/features/tasks/repositories/remote-task-repository";
import type { TaskFormValues } from "@/features/tasks/schemas/task-schema";
import type { Task } from "@/features/tasks/types/task.types";
import { DEFAULT_TASK_FILTERS, getTaskPage } from "@/features/tasks/utils/task-list-query";

const repository = new RemoteTaskRepository();

const task: Task = {
  id: "task/one",
  title: "测试任务",
  description: "测试说明",
  status: "todo",
  priority: "medium",
  tags: ["测试"],
  createdAt: "2026-09-24T10:00:00.000Z",
};

const formValues: TaskFormValues = {
  title: "测试任务",
  description: "测试说明",
  status: "todo",
  priority: "medium",
  tags: "测试",
  dueDate: "",
};

afterEach(() => vi.restoreAllMocks());

describe("RemoteTaskRepository", () => {
  it("serializes all page filters, bypasses cache, and forwards cancellation", async () => {
    const result = getTaskPage([task], DEFAULT_TASK_FILTERS);
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(jsonResponse(result));
    const controller = new AbortController();
    await expect(
      repository.listPage(
        {
          query: "中文 & space",
          tag: "work",
          status: "done",
          priority: "high",
          due: "near",
          risk: "overdue",
          date: "2026-10-15",
          range: "week",
          sort: "due_asc",
        },
        2,
        { signal: controller.signal },
      ),
    ).resolves.toEqual(result);
    const params = new URL(fetchMock.mock.calls[0][0] as string, "http://localhost").searchParams;
    expect(Object.fromEntries(params)).toEqual({
      query: "中文 & space",
      tag: "work",
      status: "done",
      priority: "high",
      due: "near",
      risk: "overdue",
      date: "2026-10-15",
      range: "week",
      sort: "due_asc",
      page: "2",
      limit: "50",
    });
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ cache: "no-store", signal: controller.signal });
  });

  it("rejects malformed page data", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(jsonResponse({ tasks: [], total: "1" }));
    await expect(repository.listPage(DEFAULT_TASK_FILTERS, 1)).rejects.toThrow("无法加载任务列表");
  });

  it("exports all tasks through the existing export endpoint", async () => {
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(jsonResponse({ tasks: [task] }));
    await expect(repository.exportAll()).resolves.toEqual([task]);
    expect(fetchMock).toHaveBeenCalledWith("/api/tasks?export=1", expect.any(Object));
  });
  it("lists tasks through the existing tasks API", async () => {
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(jsonResponse({ tasks: [task] }));

    await expect(repository.list()).resolves.toEqual([task]);
    expect(fetchMock).toHaveBeenCalledWith("/api/tasks", {
      method: "GET",
      headers: undefined,
      body: undefined,
      credentials: "include",
    });
  });

  it("creates a task with the existing request contract", async () => {
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(jsonResponse({ task }, 201));

    await expect(repository.create(formValues)).resolves.toEqual(task);
    expect(fetchMock).toHaveBeenCalledWith("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formValues),
      credentials: "include",
    });
  });

  it("encodes task ids for reads and returns null for a missing task", async () => {
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(new Response(null, { status: 404 }));

    await expect(repository.get("task/one")).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledWith("/api/tasks/task%2Fone", { method: "GET", credentials: "include" });
  });

  it("updates task fields and status through explicit repository methods", async () => {
    const fetchMock = vi
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(jsonResponse({ task }))
      .mockResolvedValueOnce(jsonResponse({ task: { ...task, status: "done" } }));

    await repository.update("task/one", formValues);
    await repository.updateStatus("task/one", "done");

    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/tasks/task%2Fone", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formValues),
      credentials: "include",
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/tasks/task%2Fone", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "done" }),
      credentials: "include",
    });
  });

  it("deletes a task without requiring a response body", async () => {
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(new Response(null, { status: 204 }));

    await expect(repository.delete("task/one")).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith("/api/tasks/task%2Fone", {
      method: "DELETE",
      headers: undefined,
      body: undefined,
      credentials: "include",
    });
  });

  it("surfaces the API error message", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(jsonResponse({ message: "任务保存失败。" }, 500));

    await expect(repository.create(formValues)).rejects.toThrow("任务保存失败。");
  });

  it("queries a due-date range with task counts and forwards cancellation", async () => {
    const result = { tasks: [task], hasAnyTasks: true, attention: { overdueCount: 1, nearDueCount: 2 } };
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(jsonResponse(result));
    const controller = new AbortController();
    await expect(
      repository.listByDueRange({ from: "2026-10-01", to: "2026-11-01" }, { signal: controller.signal }),
    ).resolves.toEqual(result);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/tasks/range?from=2026-10-01&to=2026-11-01",
      expect.objectContaining({ signal: controller.signal }),
    );
  });

  it("rejects an invalid successful range response instead of treating it as an empty calendar", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(jsonResponse({ message: "unexpected" }));
    await expect(repository.listByDueRange({ from: "2026-10-01", to: "2026-11-01" })).rejects.toThrow(
      "无法加载日历任务",
    );
  });

  it("preserves cancellation errors without replacing them with request failures", async () => {
    const abort = new DOMException("Aborted", "AbortError");
    vi.spyOn(global, "fetch").mockRejectedValue(abort);
    await expect(repository.listByDueRange({ from: "2026-10-01", to: "2026-11-01" })).rejects.toBe(abort);
  });
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
