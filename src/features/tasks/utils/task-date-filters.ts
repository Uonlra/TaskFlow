import type { Task } from "@/features/tasks/types/task.types";
import { DASHBOARD_RANGE_VALUES, type DashboardRangeValue } from "@/shared/lib/constants/query-params";

export type TaskDateRangeValue = Extract<DashboardRangeValue, "today" | "week" | "all">;

type TaskDateRangeInput = {
  date?: Date | null;
  range?: TaskDateRangeValue | "";
};

export function parseTaskDateParam(value: string | null | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [yearPart, monthPart, dayPart] = value.split("-");
  const year = Number(yearPart);
  const month = Number(monthPart);
  const day = Number(dayPart);
  const date = startOfTaskDay(new Date(year, month - 1, day));

  if (Number.isNaN(date.getTime()) || formatTaskDateParam(date) !== value) {
    return null;
  }

  return date;
}

export function formatTaskDateParam(date: Date): string {
  const value = startOfTaskDay(date);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function startOfTaskDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function addTaskDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return startOfTaskDay(next);
}

export function getTaskWeekStart(date: Date): Date {
  const start = startOfTaskDay(date);
  const day = start.getDay();
  const offset = day === 0 ? -6 : 1 - day;

  return addTaskDays(start, offset);
}

export function getTaskWeekEnd(date: Date): Date {
  const end = addTaskDays(getTaskWeekStart(date), 7);
  end.setMilliseconds(end.getMilliseconds() - 1);
  return end;
}

export function parseTaskDueDate(task: Task): Date | null {
  if (!task.dueDate) {
    return null;
  }

  const date = /^\d{4}-\d{2}-\d{2}$/.test(task.dueDate)
    ? parseTaskDateParam(task.dueDate)
    : startOfTaskDay(new Date(task.dueDate));

  return date && !Number.isNaN(date.getTime()) ? date : null;
}

export function hasTaskDueDate(task: Task): boolean {
  return Boolean(parseTaskDueDate(task));
}

export function isTaskDueOnDate(task: Task, date: Date): boolean {
  const dueDate = parseTaskDueDate(task);

  return Boolean(dueDate && startOfTaskDay(dueDate).getTime() === startOfTaskDay(date).getTime());
}

export function isTaskDueInWeek(task: Task, weekAnchorDate: Date): boolean {
  const dueDate = parseTaskDueDate(task);

  return Boolean(dueDate && isWithinTaskDateRange(dueDate, getTaskWeekStart(weekAnchorDate), addTaskDays(getTaskWeekStart(weekAnchorDate), 7)));
}

export function isTaskDueInRange(task: Task, input: TaskDateRangeInput): boolean {
  if (input.range === DASHBOARD_RANGE_VALUES.all) {
    return hasTaskDueDate(task);
  }

  const anchorDate = input.date ? startOfTaskDay(input.date) : startOfTaskDay(new Date());

  if (input.range === DASHBOARD_RANGE_VALUES.week) {
    return isTaskDueInWeek(task, anchorDate);
  }

  if (input.range === DASHBOARD_RANGE_VALUES.today || input.date) {
    return isTaskDueOnDate(task, anchorDate);
  }

  return true;
}

export function filterTasksByTaskDateRange(tasks: Task[], input: TaskDateRangeInput): Task[] {
  if (!hasActiveTaskDateRangeFilter(input)) {
    return tasks;
  }

  return tasks.filter((task) => isTaskDueInRange(task, input));
}

export function hasActiveTaskDateRangeFilter(input: { date?: Date | null; range?: string | null }): boolean {
  return Boolean(input.date || input.range === DASHBOARD_RANGE_VALUES.today || input.range === DASHBOARD_RANGE_VALUES.week || input.range === DASHBOARD_RANGE_VALUES.all);
}

function isWithinTaskDateRange(value: Date, start: Date, exclusiveEnd: Date): boolean {
  const timestamp = value.getTime();
  return timestamp >= start.getTime() && timestamp < exclusiveEnd.getTime();
}

