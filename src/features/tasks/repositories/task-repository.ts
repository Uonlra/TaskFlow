import type { TaskFormValues } from "@/features/tasks/schemas/task-schema";
import type { Task } from "@/features/tasks/types/task.types";

/**
 * Task persistence boundary shared by the web API today and local SQLite later.
 */
export interface TaskRepository {
  list(): Promise<Task[]>;
  get(id: string): Promise<Task | null>;
  create(input: TaskFormValues): Promise<Task>;
  update(id: string, input: TaskFormValues): Promise<Task>;
  updateStatus(id: string, status: Task["status"]): Promise<Task>;
  delete(id: string): Promise<void>;
}
