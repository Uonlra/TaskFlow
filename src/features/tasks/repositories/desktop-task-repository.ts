import type { TaskRepository } from "@/features/tasks/repositories/task-repository";
import type { TaskFormValues } from "@/features/tasks/schemas/task-schema";
import type { Task } from "@/features/tasks/types/task.types";
import type { TaskDueRangeQuery, TaskDueRangeResult, TaskRequestOptions } from "@/features/tasks/types/task-query";
import type { TaskFilters } from "@/features/tasks/types/task-filters";
import { getTaskPage, type TaskPageResult } from "@/features/tasks/utils/task-list-query";
import { getTaskDueMeta } from "@/features/tasks/utils/task-deadline";
import { getDesktopBridge } from "@/shared/lib/desktop/bridge";

/**
 * Task repository backed by Electron's encrypted SQLite bridge.
 * The bridge is intentionally resolved for every operation so SSR and the
 * normal web app continue to use the remote repository.
 */
export class DesktopTaskRepository implements TaskRepository {
  constructor(private readonly accountId: string) {
    if (!accountId) throw new Error("桌面端任务操作缺少当前账户。");
  }

  async listPage(filters: TaskFilters, page: number, options?: TaskRequestOptions): Promise<TaskPageResult> {
    throwIfAborted(options?.signal);
    const tasks = await this.list(options);
    throwIfAborted(options?.signal);
    return getTaskPage(tasks, filters, page);
  }

  async exportAll(options?: TaskRequestOptions): Promise<Task[]> {
    return this.list(options);
  }

  async list(options?: TaskRequestOptions): Promise<Task[]> {
    throwIfAborted(options?.signal);
    const bridge = requireBridge();
    const tasks = await bridge.localTasks.list({ accountId: this.accountId });
    throwIfAborted(options?.signal);
    return tasks.map(normalizeTask);
  }

  async importRemoteTasks(tasks: Task[]) {
    const imported = await requireBridge().localTasks.upsert({ accountId: this.accountId, tasks });
    return imported.map(normalizeTask);
  }

  async listByDueRange(query: TaskDueRangeQuery, options?: TaskRequestOptions): Promise<TaskDueRangeResult> {
    const tasks = await this.list(options);
    const from = parseDateBoundary(query.from, false);
    const to = parseDateBoundary(query.to, true);
    const rangedTasks = tasks.filter((task) => {
      if (!task.dueDate) return false;
      const due = parseDateBoundary(task.dueDate, false);
      return due !== null && (!from || due >= from) && (!to || due <= to);
    });
    const attention = tasks.reduce(
      (result, task) => {
        if (task.status === "done") return result;
        const due = getTaskDueMeta(task);
        if (due.isOverdue) result.overdueCount += 1;
        if (due.isDueToday || due.isUpcoming) result.nearDueCount += 1;
        return result;
      },
      { overdueCount: 0, nearDueCount: 0 },
    );
    return { tasks: rangedTasks, hasAnyTasks: tasks.length > 0, attention };
  }

  async get(id: string, options?: TaskRequestOptions): Promise<Task | null> {
    throwIfAborted(options?.signal);
    const task = await requireBridge().localTasks.get({ accountId: this.accountId, taskId: id });
    throwIfAborted(options?.signal);
    return task ? normalizeTask(task) : null;
  }

  async create(input: TaskFormValues, options?: TaskRequestOptions): Promise<Task> {
    throwIfAborted(options?.signal);
    return normalizeTask(await requireBridge().localTasks.create({ accountId: this.accountId, task: input }));
  }

  async update(id: string, input: TaskFormValues, options?: TaskRequestOptions): Promise<Task> {
    throwIfAborted(options?.signal);
    return normalizeTask(
      await requireBridge().localTasks.update({ accountId: this.accountId, taskId: id, task: input }),
    );
  }

  async updateStatus(id: string, status: Task["status"], options?: TaskRequestOptions): Promise<Task> {
    throwIfAborted(options?.signal);
    return normalizeTask(
      await requireBridge().localTasks.updateStatus({ accountId: this.accountId, taskId: id, status }),
    );
  }

  async delete(id: string, options?: TaskRequestOptions): Promise<void> {
    throwIfAborted(options?.signal);
    await requireBridge().localTasks.delete({ accountId: this.accountId, taskId: id });
  }
}

function requireBridge() {
  const bridge = getDesktopBridge();
  if (!bridge) throw new Error("桌面端本地任务服务不可用。");
  return bridge;
}

function normalizeTask(task: Task): Task {
  return { ...task, tags: task.tags ?? [] };
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException("请求已取消。", "AbortError");
}

function parseDateBoundary(value: string, endOfDay: boolean) {
  const date = new Date(`${value}${value.length === 10 ? (endOfDay ? "T23:59:59.999" : "T00:00:00.000") : ""}`);
  return Number.isNaN(date.getTime()) ? null : date.getTime();
}
