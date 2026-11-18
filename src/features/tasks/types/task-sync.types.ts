import type { Task } from "./task.types";

export type TaskSyncFailureCode = "conflict" | "auth" | "permission" | "invalid" | "temporary";
export type TaskSyncConflict = {
  taskId: string;
  operationId: string;
  local: Task;
  remote: Task;
  detectedAt: string;
};
export type TaskSyncResolution = { taskId: string; copyTaskId: string | null };
export type ResolveTaskSyncConflict = {
  accountId: string;
  taskId: string;
  operationId: string;
  resolutionId: string;
  copyTaskId: string;
  mode: "keep_both" | "use_cloud";
  discardConfirmed: boolean;
  expectedRemote: Task;
  remote: Task;
};
