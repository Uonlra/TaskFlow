import type { TaskRepository } from "@/features/tasks/repositories/task-repository";
import type { TaskFormValues } from "@/features/tasks/schemas/task-schema";
import type { Task } from "@/features/tasks/types/task.types";
import type { TaskDueRangeQuery, TaskDueRangeResult, TaskRequestOptions } from "@/features/tasks/types/task-query";
import type { TaskFilters } from "@/features/tasks/types/task-filters";
import { buildTaskPageParams, type TaskPageResult } from "@/features/tasks/utils/task-list-query";
import { apiFetch, requestJson as request, readJsonResponse as readResponse } from "@/shared/lib/api/client";

export class RemoteTaskRepository implements TaskRepository {
  async listPage(filters: TaskFilters, page: number, options?: TaskRequestOptions): Promise<TaskPageResult> {
    const payload = await request<TaskPageResult>(`/api/tasks?${buildTaskPageParams(filters, page)}`, {
      cache: "no-store",
      ...options,
    });
    if (!Array.isArray(payload?.tasks) || typeof payload.total !== "number") {
      throw new Error("无法加载任务列表。");
    }
    return payload;
  }

  async exportAll(options?: TaskRequestOptions): Promise<Task[]> {
    const payload = await request<{ tasks: Task[] }>("/api/tasks?export=1", options);
    if (!Array.isArray(payload?.tasks)) throw new Error("导出任务失败。");
    return payload.tasks;
  }

  async list(options?: TaskRequestOptions): Promise<Task[]> {
    const payload = await request<{ tasks: Task[] }>("/api/tasks", options);
    return payload.tasks ?? [];
  }

  async listByDueRange(query: TaskDueRangeQuery, options?: TaskRequestOptions): Promise<TaskDueRangeResult> {
    const params = new URLSearchParams(query);
    const payload = await request<TaskDueRangeResult>(`/api/tasks/range?${params.toString()}`, options);
    if (!Array.isArray(payload?.tasks)) throw new Error("无法加载日历任务。");
    return {
      tasks: payload.tasks,
      hasAnyTasks: Boolean(payload.hasAnyTasks),
      attention: payload.attention ?? { overdueCount: 0, nearDueCount: 0 },
    };
  }

  async get(id: string, options?: TaskRequestOptions): Promise<Task | null> {
    const response = await apiFetch(taskPath(id), { method: "GET", ...signalOptions(options) });

    if (response.status === 404) return null;

    const payload = await readResponse<{ task: Task }>(response);
    return payload.task;
  }

  async create(input: TaskFormValues, options?: TaskRequestOptions): Promise<Task> {
    const payload = await request<{ task: Task }>("/api/tasks", {
      method: "POST",
      body: input,
      ...options,
    });
    return payload.task;
  }

  async update(id: string, input: TaskFormValues, options?: TaskRequestOptions): Promise<Task> {
    const payload = await request<{ task: Task }>(taskPath(id), {
      method: "PATCH",
      body: input,
      ...options,
    });
    return payload.task;
  }

  async updateStatus(id: string, status: Task["status"], options?: TaskRequestOptions): Promise<Task> {
    const payload = await request<{ task: Task }>(taskPath(id), {
      method: "PATCH",
      body: { status },
      ...options,
    });
    return payload.task;
  }

  async delete(id: string, options?: TaskRequestOptions): Promise<void> {
    await request(taskPath(id), { method: "DELETE", ...options });
  }
}

export const remoteTaskRepository = new RemoteTaskRepository();

function taskPath(id: string) {
  return `/api/tasks/${encodeURIComponent(id)}`;
}

function signalOptions(options?: TaskRequestOptions) {
  return options?.signal ? { signal: options.signal } : {};
}
