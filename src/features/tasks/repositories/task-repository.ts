import type { TaskFormValues } from "@/features/tasks/schemas/task-schema";
import type { Task } from "@/features/tasks/types/task.types";
import type { TaskDueRangeQuery, TaskDueRangeResult, TaskRequestOptions } from "@/features/tasks/types/task-query";
import type { TaskFilters } from "@/features/tasks/types/task-filters";
import type { TaskPageResult } from "@/features/tasks/utils/task-list-query";

/**
 * Task persistence boundary shared by the web API today and local SQLite later.
 */
export interface TaskRepository {
  listPage(filters: TaskFilters, page: number, options?: TaskRequestOptions): Promise<TaskPageResult>;
  exportAll(options?: TaskRequestOptions): Promise<Task[]>;
  list(options?: TaskRequestOptions): Promise<Task[]>;
  listByDueRange(query: TaskDueRangeQuery, options?: TaskRequestOptions): Promise<TaskDueRangeResult>;
  get(id: string, options?: TaskRequestOptions): Promise<Task | null>;
  create(input: TaskFormValues, options?: TaskRequestOptions): Promise<Task>;
  update(id: string, input: TaskFormValues, options?: TaskRequestOptions): Promise<Task>;
  updateStatus(id: string, status: Task["status"], options?: TaskRequestOptions): Promise<Task>;
  delete(id: string, options?: TaskRequestOptions): Promise<void>;
}
