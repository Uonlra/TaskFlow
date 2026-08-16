import type { Task, TaskPriority, TaskStatus } from "@/features/tasks/types/task.types";
import { getTaskDueMeta, sortTasks } from "@/features/tasks/utils/task-deadline";

export type TaskPreviewTask = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  dueLabel: string;
};

export type TaskCalendarGroup = {
  label: string;
  tasks: TaskPreviewTask[];
};

export type TaskPreviewSummary = {
  totalCount: number;
  todoCount: number;
  inProgressCount: number;
  doneCount: number;
  completionRate: number;
  overdueCount: number;
  dueTodayCount: number;
  upcomingCount: number;
  focusTasks: TaskPreviewTask[];
  recentTasks: TaskPreviewTask[];
  calendarGroups: TaskCalendarGroup[];
  priorityCounts: Record<TaskPriority, number>;
  statusCounts: Record<TaskStatus, number>;
  topTags: Array<{ tag: string; count: number }>;
};

const emptyPriorityCounts: Record<TaskPriority, number> = {
  low: 0,
  medium: 0,
  high: 0,
};

const emptyStatusCounts: Record<TaskStatus, number> = {
  todo: 0,
  in_progress: 0,
  done: 0,
};

export function getTaskPreviewSummary(tasks: Task[]): TaskPreviewSummary {
  const statusCounts = tasks.reduce<Record<TaskStatus, number>>(
    (counts, task) => {
      counts[task.status] += 1;
      return counts;
    },
    { ...emptyStatusCounts },
  );

  const priorityCounts = tasks.reduce<Record<TaskPriority, number>>(
    (counts, task) => {
      counts[task.priority] += 1;
      return counts;
    },
    { ...emptyPriorityCounts },
  );

  const dueCounts = tasks.reduce(
    (counts, task) => {
      const dueMeta = getTaskDueMeta(task);

      if (dueMeta.isOverdue) {
        counts.overdue += 1;
      }

      if (dueMeta.isDueToday) {
        counts.today += 1;
      }

      if (dueMeta.isUpcoming) {
        counts.upcoming += 1;
      }

      return counts;
    },
    { overdue: 0, today: 0, upcoming: 0 },
  );

  const sortedByDeadline = sortTasks(tasks, "due_asc");
  const focusTasks = sortedByDeadline
    .filter((task) => task.status !== "done")
    .slice(0, 3)
    .map(toPreviewTask);
  const recentTasks = sortTasks(tasks, "updated_desc").slice(0, 3).map(toPreviewTask);
  const totalCount = tasks.length;
  const doneCount = statusCounts.done;

  return {
    totalCount,
    todoCount: statusCounts.todo,
    inProgressCount: statusCounts.in_progress,
    doneCount,
    completionRate: totalCount ? Math.round((doneCount / totalCount) * 100) : 0,
    overdueCount: dueCounts.overdue,
    dueTodayCount: dueCounts.today,
    upcomingCount: dueCounts.upcoming,
    focusTasks,
    recentTasks,
    calendarGroups: buildCalendarGroups(sortedByDeadline),
    priorityCounts,
    statusCounts,
    topTags: buildTopTags(tasks),
  };
}

export function getEmptyTaskPreviewSummary(): TaskPreviewSummary {
  return getTaskPreviewSummary([]);
}

function toPreviewTask(task: Task): TaskPreviewTask {
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate,
    dueLabel: formatPreviewDueLabel(task),
  };
}

function buildCalendarGroups(tasks: Task[]): TaskCalendarGroup[] {
  const groups: TaskCalendarGroup[] = [
    { label: "今天", tasks: [] },
    { label: "明天", tasks: [] },
    { label: "之后", tasks: [] },
  ];

  tasks
    .filter((task) => task.status !== "done")
    .forEach((task) => {
      const offset = getDueDayOffset(task.dueDate);
      const previewTask = toPreviewTask(task);

      if (offset === 0) {
        groups[0].tasks.push(previewTask);
        return;
      }

      if (offset === 1) {
        groups[1].tasks.push(previewTask);
        return;
      }

      groups[2].tasks.push(previewTask);
    });

  return groups.map((group) => ({
    ...group,
    tasks: group.tasks.slice(0, 3),
  }));
}

function buildTopTags(tasks: Task[]) {
  const counter = new Map<string, number>();

  tasks.forEach((task) => {
    (task.tags ?? []).forEach((tag) => {
      counter.set(tag, (counter.get(tag) ?? 0) + 1);
    });
  });

  return Array.from(counter.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], "zh-CN"))
    .slice(0, 5)
    .map(([tag, count]) => ({ tag, count }));
}

function formatPreviewDueLabel(task: Task) {
  if (!task.dueDate) {
    return "未设置截止日期";
  }

  const offset = getDueDayOffset(task.dueDate);

  if (offset === null) {
    return task.dueDate;
  }

  if (offset < 0) {
    return `已逾期 ${Math.abs(offset)} 天`;
  }

  if (offset === 0) {
    return "今天";
  }

  if (offset === 1) {
    return "明天";
  }

  if (offset <= 3) {
    return `${offset} 天后`;
  }

  return task.dueDate;
}

function getDueDayOffset(value: string | undefined) {
  if (!value) {
    return null;
  }

  const dueDate = startOfDay(new Date(value));

  if (Number.isNaN(dueDate.getTime())) {
    return null;
  }

  const today = startOfDay(new Date());

  return Math.round((dueDate.getTime() - today.getTime()) / 86400000);
}

function startOfDay(value: Date) {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
}
