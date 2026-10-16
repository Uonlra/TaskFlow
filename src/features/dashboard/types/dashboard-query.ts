import type { TaskPriority, TaskStatus } from "@/features/tasks/types/task.types";
import type { DashboardAnalyticsRange, DashboardStats } from "@/features/tasks/utils/task-analytics";
import type { TaskDueFilter } from "@/shared/lib/constants/query-params";

export type DashboardPriorityFilters = {
  status: TaskStatus | "all";
  priority: TaskPriority | "all";
  due: TaskDueFilter | "";
};

export type DashboardSummaryQuery = DashboardPriorityFilters & { range: DashboardAnalyticsRange };
export type DashboardSummary = { stats: DashboardStats; hasAnyTasks: boolean };

export function buildDashboardSummaryParams(query: DashboardSummaryQuery) {
  const params = new URLSearchParams({ range: query.range });
  if (query.status !== "all") params.set("status", query.status);
  if (query.priority !== "all") params.set("priority", query.priority);
  if (query.due) params.set("due", query.due);
  return params;
}
