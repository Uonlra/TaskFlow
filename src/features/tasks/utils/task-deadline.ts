import type { Task, TaskPriority } from "@/features/tasks/types/task.types";
import { TASK_DUE_FILTERS, type TaskDueFilter } from "@/shared/lib/constants/query-params";

export type TaskSort =
  | "created_desc"
  | "updated_desc"
  | "due_asc"
  | "priority_desc";

export type TaskDueTone = "danger" | "warning" | "success" | "muted";

export type TaskDueMeta = {
  label: string;
  tone: TaskDueTone;
  sortWeight: number;
  isOverdue: boolean;
  isDueToday: boolean;
  isUpcoming: boolean;
};

const priorityScore: Record<TaskPriority, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

export function getTaskDueMeta(task: Task): TaskDueMeta {
  if (task.status === "done") {
    return {
      label: "已完成",
      tone: "success",
      sortWeight: Number.POSITIVE_INFINITY,
      isOverdue: false,
      isDueToday: false,
      isUpcoming: false,
    };
  }

  if (!task.dueDate) {
    return {
      label: "未设置截止日期",
      tone: "muted",
      sortWeight: Number.POSITIVE_INFINITY,
      isOverdue: false,
      isDueToday: false,
      isUpcoming: false,
    };
  }

  const today = startOfDay(new Date());
  const dueDate = startOfDay(new Date(task.dueDate));

  if (Number.isNaN(dueDate.getTime())) {
    return {
      label: `截止：${task.dueDate}`,
      tone: "muted",
      sortWeight: Number.POSITIVE_INFINITY,
      isOverdue: false,
      isDueToday: false,
      isUpcoming: false,
    };
  }

  const diffDays = Math.round((dueDate.getTime() - today.getTime()) / 86400000);

  if (diffDays < 0) {
    return {
      label: `已逾期 ${Math.abs(diffDays)} 天`,
      tone: "danger",
      sortWeight: diffDays,
      isOverdue: true,
      isDueToday: false,
      isUpcoming: false,
    };
  }

  if (diffDays === 0) {
    return {
      label: "今天到期",
      tone: "warning",
      sortWeight: 0,
      isOverdue: false,
      isDueToday: true,
      isUpcoming: false,
    };
  }

  if (diffDays <= 3) {
    return {
      label: `${diffDays} 天后到期`,
      tone: "success",
      sortWeight: diffDays,
      isOverdue: false,
      isDueToday: false,
      isUpcoming: true,
    };
  }

  return {
    label: `${task.dueDate} 截止`,
    tone: "muted",
    sortWeight: diffDays,
    isOverdue: false,
    isDueToday: false,
    isUpcoming: false,
  };
}

export function matchesTaskDueFilter(task: Task, due: TaskDueFilter): boolean {
  if (task.status === "done") {
    return false;
  }

  const dueMeta = getTaskDueMeta(task);

  if (due === TASK_DUE_FILTERS.near) {
    return dueMeta.isDueToday || dueMeta.isUpcoming;
  }

  if (due === TASK_DUE_FILTERS.today) {
    return dueMeta.isDueToday;
  }

  if (due === TASK_DUE_FILTERS.upcoming) {
    return dueMeta.isUpcoming;
  }

  return dueMeta.isOverdue;
}

export function sortTasks(tasks: Task[], sort: TaskSort) {
  const nextTasks = [...tasks];

  nextTasks.sort((left, right) => {
    if (sort === "created_desc") {
      return compareDateDesc(left.createdAt, right.createdAt);
    }

    if (sort === "updated_desc") {
      return compareDateDesc(left.updatedAt ?? left.createdAt, right.updatedAt ?? right.createdAt);
    }

    if (sort === "priority_desc") {
      const priorityDiff = priorityScore[right.priority] - priorityScore[left.priority];

      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      return compareDateDesc(left.createdAt, right.createdAt);
    }

    const dueDiff = getTaskDueMeta(left).sortWeight - getTaskDueMeta(right).sortWeight;

    if (dueDiff !== 0) {
      return dueDiff;
    }

    return compareDateDesc(left.createdAt, right.createdAt);
  });

  return nextTasks;
}

function compareDateDesc(left: string, right: string) {
  return new Date(right).getTime() - new Date(left).getTime();
}

function startOfDay(value: Date) {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
}
