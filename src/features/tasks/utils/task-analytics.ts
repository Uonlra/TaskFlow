import type { Task, TaskPriority, TaskStatus } from "@/features/tasks/types/task.types";
import { getTaskDueMeta, sortTasks } from "@/features/tasks/utils/task-deadline";
import { parseTaskDueDate, parseTaskDueDateValue } from "@/features/tasks/utils/task-date-filters";

export type DashboardAnalyticsRange = "today" | "week" | "all";

export type DashboardMetric = {
  id: "todayTotal" | "completionRate" | "inProgress" | "overdue" | "upcoming";
  label: string;
  value: string;
  helper: string;
  tone: "blue" | "green" | "orange" | "red" | "purple";
};

export type DashboardTrendPoint = {
  label: string;
  date: string;
  completed: number;
  created: number;
};

export type DashboardDistributionItem<TValue extends string = string> = {
  value: TValue;
  label: string;
  count: number;
  ratio: number;
  color: string;
};

export type DashboardTagTopItem = {
  tag: string;
  count: number;
  ratio: number;
  color: string;
};

export type DashboardRiskLevel = "high" | "medium" | "low";

export type DashboardOverdueRiskItem = {
  level: DashboardRiskLevel;
  label: string;
  count: number;
  helper: string;
  color: string;
};

export type DashboardTaskPreview = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  dueLabel: string;
  tags: string[];
};

export type DashboardTodayPace = {
  completedCount: number;
  inProgressCount: number;
  dueTodayCount: number;
  overdueCount: number;
};
export type DashboardStats = {
  range: DashboardAnalyticsRange;
  totalCount: number;
  activeCount: number;
  completedCount: number;
  completionRate: number;
  inProgressCount: number;
  overdueCount: number;
  dueTodayCount: number;
  upcomingCount: number;
  todayPace: DashboardTodayPace;
  metrics: DashboardMetric[];
  trend: DashboardTrendPoint[];
  statusDistribution: Array<DashboardDistributionItem<TaskStatus>>;
  priorityDistribution: Array<DashboardDistributionItem<TaskPriority>>;
  tagTop: DashboardTagTopItem[];
  overdueRisk: DashboardOverdueRiskItem[];
  focusTasks: DashboardTaskPreview[];
  upcomingDeadlines: DashboardTaskPreview[];
};

type DashboardAnalyticsOptions = {
  range?: DashboardAnalyticsRange;
  referenceDate?: Date;
  trendDays?: number;
  tagLimit?: number;
};

const statusLabels: Record<TaskStatus, string> = {
  todo: "待开始",
  in_progress: "进行中",
  done: "已完成",
};

const priorityLabels: Record<TaskPriority, string> = {
  high: "高优先级",
  medium: "中优先级",
  low: "低优先级",
};

const statusColors: Record<TaskStatus, string> = {
  todo: "#9ca3af",
  in_progress: "#3e6ae1",
  done: "#10b981",
};

const priorityColors: Record<TaskPriority, string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#3e6ae1",
};

const tagColors = ["#3e6ae1", "#10b981", "#8b5cf6", "#f59e0b", "#14b8a6"];

export function buildDashboardStats(tasks: Task[], options: DashboardAnalyticsOptions = {}): DashboardStats {
  const range = options.range ?? "today";
  const referenceDate = startOfDay(options.referenceDate ?? new Date());
  const scopedTasks = filterTasksByRange(tasks, range, referenceDate);
  const activeTasks = scopedTasks.filter((task) => task.status !== "done");
  const completedCount = scopedTasks.filter((task) => task.status === "done").length;
  const inProgressCount = scopedTasks.filter((task) => task.status === "in_progress").length;
  const dueCounts = buildDueCounts(activeTasks, range, referenceDate);
  const todayPace = buildTodayPace(tasks, referenceDate);
  const totalCount = scopedTasks.length;
  const completionRate = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;
  const focusTasks = buildFocusTasks(scopedTasks);

  return {
    range,
    totalCount,
    activeCount: activeTasks.length,
    completedCount,
    completionRate,
    inProgressCount,
    overdueCount: dueCounts.overdue,
    dueTodayCount: dueCounts.today,
    upcomingCount: dueCounts.upcoming,
    todayPace,
    metrics: buildMetricCards({
      totalCount,
      completionRate,
      inProgressCount,
      overdueCount: dueCounts.overdue,
      upcomingCount: dueCounts.upcoming,
      dueRangeCount: dueCounts.rangeDue,
      activeCount: activeTasks.length,
      range,
    }),
    trend: buildTrendData(scopedTasks, {
      referenceDate,
      days: options.trendDays ?? 7,
    }),
    statusDistribution: buildStatusDistribution(scopedTasks),
    priorityDistribution: buildPriorityDistribution(scopedTasks),
    tagTop: buildTagTop(scopedTasks, options.tagLimit ?? 5),
    overdueRisk: buildOverdueRisk(activeTasks),
    focusTasks,
    upcomingDeadlines: buildUpcomingDeadlines(activeTasks, new Set(focusTasks.map((task) => task.id))),
  };
}

export function filterTasksByRange(tasks: Task[], range: DashboardAnalyticsRange, referenceDate = new Date()) {
  if (range === "all") {
    return tasks;
  }

  const start = startOfDay(referenceDate);
  const end = new Date(start);
  end.setDate(start.getDate() + (range === "today" ? 1 : 7));

  return tasks.filter((task) => {
    const checkpoints = [task.createdAt, task.updatedAt, task.completedAt].filter(Boolean) as string[];
    const dueDate = parseTaskDueDate(task);

    return (
      checkpoints.some((value) => {
        const timestamp = new Date(value).getTime();

        return !Number.isNaN(timestamp) && timestamp >= start.getTime() && timestamp < end.getTime();
      }) ||
      (dueDate !== null && dueDate.getTime() >= start.getTime() && dueDate.getTime() < end.getTime())
    );
  });
}

export function buildTrendData(
  tasks: Task[],
  options: { referenceDate?: Date; days?: number } = {},
): DashboardTrendPoint[] {
  const days = options.days ?? 7;
  const today = startOfDay(options.referenceDate ?? new Date());

  return Array.from({ length: days }, (_, index) => {
    const day = new Date(today);
    day.setDate(today.getDate() - (days - index - 1));

    const nextDay = new Date(day);
    nextDay.setDate(day.getDate() + 1);

    return {
      label: formatTrendLabel(day),
      date: day.toISOString(),
      completed: countTasksInDay(tasks, "completedAt", day, nextDay),
      created: countTasksInDay(tasks, "createdAt", day, nextDay),
    };
  });
}

export function buildStatusDistribution(tasks: Task[]): Array<DashboardDistributionItem<TaskStatus>> {
  const counts = tasks.reduce<Record<TaskStatus, number>>(
    (summary, task) => {
      summary[task.status] += 1;
      return summary;
    },
    { todo: 0, in_progress: 0, done: 0 },
  );

  return (Object.keys(counts) as TaskStatus[]).map((status) => ({
    value: status,
    label: statusLabels[status],
    count: counts[status],
    ratio: getRatio(counts[status], tasks.length),
    color: statusColors[status],
  }));
}

export function buildPriorityDistribution(tasks: Task[]): Array<DashboardDistributionItem<TaskPriority>> {
  const counts = tasks.reduce<Record<TaskPriority, number>>(
    (summary, task) => {
      summary[task.priority] += 1;
      return summary;
    },
    { high: 0, medium: 0, low: 0 },
  );

  return (["high", "medium", "low"] as TaskPriority[]).map((priority) => ({
    value: priority,
    label: priorityLabels[priority],
    count: counts[priority],
    ratio: getRatio(counts[priority], tasks.length),
    color: priorityColors[priority],
  }));
}

export function buildTagTop(tasks: Task[], limit = 5): DashboardTagTopItem[] {
  const counter = new Map<string, number>();

  tasks.forEach((task) => {
    task.tags.forEach((tag) => {
      counter.set(tag, (counter.get(tag) ?? 0) + 1);
    });
  });

  const maxCount = Math.max(1, ...counter.values());

  return Array.from(counter.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], "zh-CN"))
    .slice(0, limit)
    .map(([tag, count], index) => ({
      tag,
      count,
      ratio: Math.round((count / maxCount) * 100),
      color: tagColors[index % tagColors.length],
    }));
}

export function buildOverdueRisk(tasks: Task[]): DashboardOverdueRiskItem[] {
  const counts = tasks.reduce<Record<DashboardRiskLevel, number>>(
    (summary, task) => {
      const offset = getDueDayOffset(task.dueDate);

      if (offset === null || task.status === "done") {
        return summary;
      }

      if (offset < 0 || task.priority === "high") {
        summary.high += 1;
        return summary;
      }

      if (offset <= 1 || task.priority === "medium") {
        summary.medium += 1;
        return summary;
      }

      if (offset <= 3) {
        summary.low += 1;
      }

      return summary;
    },
    { high: 0, medium: 0, low: 0 },
  );

  return [
    { level: "high", label: "高风险", count: counts.high, helper: "逾期或高优先级", color: "#ef4444" },
    { level: "medium", label: "中风险", count: counts.medium, helper: "临近或中优先级", color: "#f59e0b" },
    { level: "low", label: "低风险", count: counts.low, helper: "3 天内到期", color: "#10b981" },
  ];
}

function buildMetricCards(input: {
  totalCount: number;
  completionRate: number;
  inProgressCount: number;
  overdueCount: number;
  upcomingCount: number;
  dueRangeCount: number;
  activeCount: number;
  range: DashboardAnalyticsRange;
}): DashboardMetric[] {
  const rangeLabel = input.range === "today" ? "今日" : input.range === "week" ? "本周" : "全部";
  const lastMetric =
    input.range === "all"
      ? { label: "待处理", value: String(input.activeCount), helper: "未完成任务" }
      : input.range === "week"
        ? { label: "本周到期", value: String(input.dueRangeCount), helper: "范围内截止" }
        : { label: "即将到期", value: String(input.upcomingCount), helper: "3 天内到期" };

  return [
    { id: "todayTotal", label: `${rangeLabel}任务`, value: String(input.totalCount), helper: "当前视图", tone: "blue" },
    { id: "completionRate", label: "完成率", value: `${input.completionRate}%`, helper: "已完成占比", tone: "green" },
    { id: "inProgress", label: "进行中", value: String(input.inProgressCount), helper: "正在推进", tone: "orange" },
    { id: "overdue", label: "已逾期", value: String(input.overdueCount), helper: "需要处理", tone: "red" },
    { id: "upcoming", label: lastMetric.label, value: lastMetric.value, helper: lastMetric.helper, tone: "purple" },
  ];
}

export function buildFocusTasks(tasks: Task[], options: { includeCompleted?: boolean } = {}) {
  return sortTasks(tasks, "priority_desc")
    .filter((task) => options.includeCompleted || task.status !== "done")
    .slice(0, 5)
    .map(toDashboardTaskPreview);
}

function buildUpcomingDeadlines(tasks: Task[], excludedIds = new Set<string>()) {
  return sortTasks(tasks, "due_asc")
    .filter((task) => task.dueDate && !excludedIds.has(task.id))
    .slice(0, 5)
    .map(toDashboardTaskPreview);
}

function toDashboardTaskPreview(task: Task): DashboardTaskPreview {
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate,
    dueLabel: getTaskDueMeta(task).label,
    tags: task.tags,
  };
}

function buildTodayPace(tasks: Task[], referenceDate: Date): DashboardTodayPace {
  const start = startOfDay(referenceDate);
  const end = new Date(start);
  end.setDate(start.getDate() + 1);

  return tasks.reduce(
    (summary, task) => {
      if (task.status === "done") {
        if (isTimestampInRange(task.completedAt, start, end)) {
          summary.completedCount += 1;
        }

        return summary;
      }

      const dueDate = parseTaskDueDate(task);

      if (dueDate && dueDate.getTime() < start.getTime()) {
        summary.overdueCount += 1;
      }

      if (dueDate && dueDate.getTime() === start.getTime()) {
        summary.dueTodayCount += 1;
      }

      if (task.status === "in_progress") {
        summary.inProgressCount += 1;
      }

      return summary;
    },
    { completedCount: 0, inProgressCount: 0, dueTodayCount: 0, overdueCount: 0 },
  );
}

function isTimestampInRange(value: string | undefined, start: Date, end: Date) {
  if (!value) {
    return false;
  }

  const timestamp = new Date(value).getTime();

  return !Number.isNaN(timestamp) && timestamp >= start.getTime() && timestamp < end.getTime();
}
function buildDueCounts(tasks: Task[], range: DashboardAnalyticsRange, referenceDate: Date) {
  const start = startOfDay(referenceDate);
  const end = new Date(start);
  end.setDate(start.getDate() + (range === "week" ? 7 : 1));

  return tasks.reduce(
    (summary, task) => {
      const dueMeta = getTaskDueMeta(task);
      const dueDate = parseTaskDueDate(task);
      const dueTimestamp = dueDate ? dueDate.getTime() : Number.NaN;

      if (dueMeta.isOverdue) {
        summary.overdue += 1;
      }

      if (dueMeta.isDueToday) {
        summary.today += 1;
      }

      if (dueMeta.isUpcoming) {
        summary.upcoming += 1;
      }

      if (
        range !== "all" &&
        !Number.isNaN(dueTimestamp) &&
        dueTimestamp >= start.getTime() &&
        dueTimestamp < end.getTime()
      ) {
        summary.rangeDue += 1;
      }

      return summary;
    },
    { overdue: 0, today: 0, upcoming: 0, rangeDue: 0 },
  );
}

function countTasksInDay(tasks: Task[], key: "completedAt" | "createdAt", start: Date, end: Date) {
  return tasks.filter((task) => {
    const value = task[key];

    if (!value) {
      return false;
    }

    const timestamp = new Date(value).getTime();

    return timestamp >= start.getTime() && timestamp < end.getTime();
  }).length;
}

function getDueDayOffset(value: string | undefined) {
  if (!value) {
    return null;
  }

  const dueDate = parseTaskDueDateValue(value);

  if (!dueDate) {
    return null;
  }

  const today = startOfDay(new Date());

  return Math.round((dueDate.getTime() - today.getTime()) / 86400000);
}

function getRatio(count: number, total: number) {
  return total ? Math.round((count / total) * 100) : 0;
}

function formatTrendLabel(date: Date) {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function startOfDay(value: Date) {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
}
