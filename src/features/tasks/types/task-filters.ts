import type { DashboardRangeValue, TaskDueFilter, TaskRiskFilter } from "@/shared/lib/constants/query-params";
import type { TaskPriority, TaskStatus } from "@/features/tasks/types/task.types";
import type { TaskSort } from "@/features/tasks/utils/task-deadline";

export type TaskStatusFilter = TaskStatus | "active" | "all";

export type TaskFilters = {
  query: string;
  tag: string;
  status: TaskStatusFilter;
  priority: TaskPriority | "all";
  due: TaskDueFilter | "";
  risk: TaskRiskFilter | "";
  date: string;
  range: DashboardRangeValue | "";
  sort: TaskSort;
};
