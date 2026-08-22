import type { TaskFilters } from "@/features/tasks/types/task-filters";
import type { Task } from "@/features/tasks/types/task.types";
import {
  DASHBOARD_RANGE_VALUES,
  TASK_DUE_FILTERS,
  TASK_RISK_FILTERS,
  type DashboardRangeValue,
} from "@/shared/lib/constants/query-params";
import {
  filterTasksByTaskDateRange,
  hasActiveTaskDateRangeFilter,
  parseTaskDateParam,
  parseTaskDueDateValue,
  startOfTaskDay,
} from "@/features/tasks/utils/task-date-filters";
import { getTaskDueMeta, sortTasks } from "@/features/tasks/utils/task-deadline";

export const DEFAULT_TASK_PAGE_SIZE = 50;
export const MAX_TASK_PAGE_SIZE = 100;

export type TaskCategoryCounts = {
  near: number;
  active: number;
  done: number;
  all: number;
};

export type TaskPageResult = {
  tasks: Task[];
  total: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
  categoryCounts: TaskCategoryCounts;
};

export function getTaskPage(
  tasks: Task[],
  filters: TaskFilters,
  page = 1,
  pageSize = DEFAULT_TASK_PAGE_SIZE,
): TaskPageResult {
  const normalizedPage = Math.max(1, Math.floor(page));
  const normalizedPageSize = Math.min(MAX_TASK_PAGE_SIZE, Math.max(1, Math.floor(pageSize)));
  const filteredTasks = filterTaskList(tasks, filters);
  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / normalizedPageSize));
  const safePage = Math.min(normalizedPage, totalPages);
  const start = (safePage - 1) * normalizedPageSize;
  const pageTasks = filteredTasks.slice(start, start + normalizedPageSize);

  return {
    tasks: pageTasks,
    total: filteredTasks.length,
    page: safePage,
    pageSize: normalizedPageSize,
    hasNext: safePage < totalPages,
    categoryCounts: buildTaskCategoryCounts(tasks),
  };
}

export function filterTaskList(tasks: Task[], filters: TaskFilters) {
  const filtered = tasks.filter((task) => {
    const normalizedQuery = filters.query.trim().toLowerCase();
    const matchQuery =
      !normalizedQuery ||
      task.title.toLowerCase().includes(normalizedQuery) ||
      task.description.toLowerCase().includes(normalizedQuery) ||
      task.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery));
    const matchTag = !filters.tag || task.tags.some((tag) => tag.toLowerCase().includes(filters.tag.toLowerCase()));
    const matchStatus =
      filters.status === "all" ||
      (filters.status === "active" ? task.status !== "done" : task.status === filters.status);
    const matchPriority = filters.priority === "all" || task.priority === filters.priority;
    const hasDateRangeFilter = hasActiveTaskDateRangeFilter({ date: parseTaskDateParam(filters.date), range: filters.range });
    const matchDateRange = matchesDateRangeFilter(task, filters.date, filters.range);
    const matchDue = hasDateRangeFilter || !filters.due || matchesTaskDueFilter(task, filters.due);
    const matchRisk = !filters.risk || matchesRiskFilter(task, filters.risk);

    return matchQuery && matchTag && matchStatus && matchPriority && matchDateRange && matchDue && matchRisk;
  });

  return sortTasks(filtered, filters.sort);
}

export function buildTaskCategoryCounts(tasks: Task[]): TaskCategoryCounts {
  return tasks.reduce(
    (counts, task) => {
      const dueMeta = getTaskDueMeta(task);
      counts.all += 1;
      if (task.status === "done") counts.done += 1;
      else counts.active += 1;
      if (task.status !== "done" && (dueMeta.isDueToday || dueMeta.isUpcoming)) counts.near += 1;
      return counts;
    },
    { near: 0, active: 0, done: 0, all: 0 },
  );
}

export function parseTaskFiltersFromParams(params: URLSearchParams): TaskFilters {
  const status = parseEnum(params.get("status"), ["todo", "in_progress", "done", "active", "all"] as const) ?? "all";
  const priority = parseEnum(params.get("priority"), ["low", "medium", "high", "all"] as const) ?? "all";
  const due = parseEnum(params.get("due"), Object.values(TASK_DUE_FILTERS) as TaskDueValue[]) ?? "";
  const risk = parseEnum(params.get("risk"), Object.values(TASK_RISK_FILTERS) as TaskRiskValue[]) ?? "";
  const sort =
    parseEnum(params.get("sort"), ["created_desc", "updated_desc", "priority_desc", "due_asc"] as const) ?? "due_asc";
  const range =
    parseEnum(params.get("range"), Object.values(DASHBOARD_RANGE_VALUES) as DashboardRangeValue[]) ?? "";
  const parsedDate = parseTaskDateParam(params.get("date") ?? undefined);

  return {
    query: params.get("query") ?? "",
    tag: params.get("tag") ?? "",
    status,
    priority,
    due,
    risk,
    date: parsedDate ? params.get("date") ?? "" : "",
    range,
    sort,
  };
}

export function parseTaskPageParam(value: string | null) {
  const page = Number(value);
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
}

function matchesRiskFilter(task: Task, risk: string) {
  if (task.status === "done") return false;
  if (risk === TASK_RISK_FILTERS.overdue) return getTaskDueMeta(task).isOverdue;
  const offset = getDueDayOffset(task.dueDate);
  if (risk === TASK_RISK_FILTERS.high) return task.priority === "high" || getTaskDueMeta(task).isOverdue;
  if (risk === TASK_RISK_FILTERS.medium) return task.priority === "medium" || (offset !== null && offset >= 0 && offset <= 1);
  return task.priority === "low" || (offset !== null && offset >= 0 && offset <= 3);
}

function matchesTaskDueFilter(task: Task, due: string) {
  const meta = getTaskDueMeta(task);
  if (due === TASK_DUE_FILTERS.today) return meta.isDueToday;
  if (due === TASK_DUE_FILTERS.upcoming) return meta.isUpcoming;
  if (due === TASK_DUE_FILTERS.overdue) return meta.isOverdue;
  return meta.isDueToday || meta.isUpcoming;
}

function matchesDateRangeFilter(task: Task, date: string, range: DashboardRangeValue | "") {
  const selectedDate = parseTaskDateParam(date);
  if (!hasActiveTaskDateRangeFilter({ date: selectedDate, range })) return true;
  return filterTasksByTaskDateRange([task], { date: selectedDate, range }).length > 0;
}

function getDueDayOffset(value: string | undefined) {
  if (!value) return null;
  const dueDate = parseTaskDueDateValue(value);
  if (!dueDate) return null;
  return Math.round((dueDate.getTime() - startOfTaskDay(new Date()).getTime()) / 86400000);
}

function parseEnum<const T extends readonly string[]>(value: string | null, values: T): T[number] | undefined {
  return value && (values as readonly string[]).includes(value) ? (value as T[number]) : undefined;
}

type TaskDueValue = (typeof TASK_DUE_FILTERS)[keyof typeof TASK_DUE_FILTERS] | "";
type TaskRiskValue = (typeof TASK_RISK_FILTERS)[keyof typeof TASK_RISK_FILTERS] | "";
