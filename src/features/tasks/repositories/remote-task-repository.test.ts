// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";

import { RemoteTaskRepository } from "@/features/tasks/repositories/remote-task-repository";
import type { TaskFormValues } from "@/features/tasks/schemas/task-schema";
import type { Task } from "@/features/tasks/types/task.types";

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
  it("lists tasks through the existing tasks API", async () => {
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(jsonResponse({ tasks: [task] }));

    await expect(repository.list()).resolves.toEqual([task]);
    expect(fetchMock).toHaveBeenCalledWith("/api/tasks", {
      method: "GET",
      headers: undefined,
      body: undefined,
    });
  });

  it("creates a task with the existing request contract", async () => {
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(jsonResponse({ task }, 201));

    await expect(repository.create(formValues)).resolves.toEqual(task);
    expect(fetchMock).toHaveBeenCalledWith("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formValues),
    });
  });

  it("encodes task ids for reads and returns null for a missing task", async () => {
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(new Response(null, { status: 404 }));

    await expect(repository.get("task/one")).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledWith("/api/tasks/task%2Fone", { method: "GET" });
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
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/tasks/task%2Fone", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "done" }),
    });
  });

  it("deletes a task without requiring a response body", async () => {
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(new Response(null, { status: 204 }));

    await expect(repository.delete("task/one")).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith("/api/tasks/task%2Fone", {
      method: "DELETE",
      headers: undefined,
      body: undefined,
    });
  });

  it("surfaces the API error message", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(jsonResponse({ message: "任务保存失败。" }, 500));

    await expect(repository.create(formValues)).rejects.toThrow("任务保存失败。");
  });
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
