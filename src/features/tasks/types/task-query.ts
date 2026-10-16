import type { Task } from "./task.types";

export type TaskRequestOptions = {
  signal?: AbortSignal;
};

export type TaskDueRangeQuery = {
  from: string;
  to: string;
};

export type TaskAttentionCounts = {
  overdueCount: number;
  nearDueCount: number;
};

export type TaskDueRangeResult = {
  tasks: Task[];
  hasAnyTasks: boolean;
  attention: TaskAttentionCounts;
};
