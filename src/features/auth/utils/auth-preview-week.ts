import type { Task } from "@/features/tasks/types/task.types";
import {
  addTaskDays,
  formatTaskDateParam,
  getTaskWeekStart,
  isTaskDueOnDate,
  parseTaskDueDate,
  startOfTaskDay,
} from "@/features/tasks/utils/task-date-filters";

export type AuthPreviewWeekDay = {
  key: string;
  weekday: string;
  dateLabel: string;
  isToday: boolean;
  taskCount: number;
  hasOverdue: boolean;
};

const weekdayLabels = ["一", "二", "三", "四", "五", "六", "日"];

export function getAuthPreviewWeek(tasks: Task[], anchorDate = new Date()): AuthPreviewWeekDay[] {
  const today = startOfTaskDay(anchorDate);
  const todayKey = formatTaskDateParam(today);
  const weekStart = getTaskWeekStart(today);

  return weekdayLabels.map((weekday, index) => {
    const date = addTaskDays(weekStart, index);
    const key = formatTaskDateParam(date);
    const dueTasks = tasks.filter((task) => isTaskDueOnDate(task, date));

    return {
      key,
      weekday,
      dateLabel: `${date.getMonth() + 1}/${date.getDate()}`,
      isToday: key === todayKey,
      taskCount: dueTasks.length,
      hasOverdue: dueTasks.some((task) => {
        const dueDate = parseTaskDueDate(task);
        return task.status !== "done" && dueDate !== null && dueDate.getTime() < today.getTime();
      }),
    };
  });
}
