import type { TaskRepository } from "@/features/tasks/repositories/task-repository";
import { DesktopTaskRepository } from "@/features/tasks/repositories/desktop-task-repository";
import { remoteTaskRepository } from "@/features/tasks/repositories/remote-task-repository";
import { isDesktopRuntime } from "@/shared/lib/desktop/bridge";

export function getTaskRepository(accountId?: string): TaskRepository {
  if (isDesktopRuntime() && accountId) return new DesktopTaskRepository(accountId);
  return remoteTaskRepository;
}
