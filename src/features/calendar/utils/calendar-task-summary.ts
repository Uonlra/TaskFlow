import type { Task, TaskStatus } from "@/features/tasks/types/task.types";
import { formatTaskDateParam, parseTaskDueDate, startOfTaskDay } from "@/features/tasks/utils/task-date-filters";

export type CalendarStatus = TaskStatus | "overdue";

export type CalendarDaySummary = {
  total: number;
  done: number;
  inProgress: number;
  todo: number;
  overdue: number;
  statusDots: CalendarStatus[];
};

const statusOrder: CalendarStatus[] = ["overdue", "in_progress", "todo", "done"];

export function buildCalendarTaskSummaries(tasks: Task[], today: Date = new Date()) {
  const summaries: Record<string, CalendarDaySummary> = {};
  const todayTimestamp = startOfTaskDay(today).getTime();

  tasks.forEach((task) => {
    const dueDate = parseTaskDueDate(task);
    if (!dueDate) return;

    const dateParam = formatTaskDateParam(dueDate);
    const summary = summaries[dateParam] ?? createEmptySummary();
    summary.total += 1;

    if (task.status === "done") {
      summary.done += 1;
    } else if (task.status === "in_progress") {
      summary.inProgress += 1;
    } else {
      summary.todo += 1;
    }

    if (task.status !== "done" && dueDate.getTime() < todayTimestamp) {
      summary.overdue += 1;
    }

    summaries[dateParam] = summary;
  });

  Object.values(summaries).forEach((summary) => {
    summary.statusDots = statusOrder.filter((status) => hasCalendarStatus(summary, status)).slice(0, 3);
  });

  return summaries;
}

function createEmptySummary(): CalendarDaySummary {
  return {
    total: 0,
    done: 0,
    inProgress: 0,
    todo: 0,
    overdue: 0,
    statusDots: [],
  };
}

function hasCalendarStatus(summary: CalendarDaySummary, status: CalendarStatus) {
  if (status === "overdue") return summary.overdue > 0;
  if (status === "in_progress") return summary.inProgress > 0;
  return summary[status] > 0;
}
