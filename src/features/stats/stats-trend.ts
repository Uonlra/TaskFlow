import type { Task } from "@/features/tasks/types/task.types";
import type { DashboardAnalyticsRange, DashboardTrendPoint } from "@/features/tasks/utils/task-analytics";
import { getTaskWeekStart, startOfTaskDay } from "@/features/tasks/utils/task-date-filters";

type TrendInterval = "four-hours" | "day" | "month" | "year";
type TrendEvent = { date: Date; kind: "created" | "completed" };

const dayMilliseconds = 86_400_000;
const intervalLabels: Record<TrendInterval, string> = {
  "four-hours": "每 4 小时",
  day: "按天",
  month: "按月",
  year: "按年",
};

export function getStatsRangeStart(range: DashboardAnalyticsRange, now: Date) {
  return range === "week" ? getTaskWeekStart(now) : startOfTaskDay(now);
}

export function buildStatsTrend(tasks: Task[], range: DashboardAnalyticsRange, now: Date) {
  const rangeStart = getStatsRangeStart(range, now);
  const from = range === "all" ? -Infinity : rangeStart.getTime();
  const events: TrendEvent[] = [];
  let earliest = now;

  for (const task of tasks) {
    const timestamps = { created: task.createdAt, completed: task.completedAt } as const;
    for (const kind of ["created", "completed"] as const) {
      const value = timestamps[kind];
      if (!value) continue;
      const date = new Date(value);
      const timestamp = date.getTime();
      if (!Number.isFinite(timestamp) || timestamp < from || timestamp > now.getTime()) continue;
      events.push({ date, kind });
      if (date < earliest) earliest = date;
    }
  }

  const interval = getTrendInterval(range, earliest, now);
  if (!events.length) return { points: [], intervalLabel: intervalLabels[interval] };

  const counts = new Map<number, { created: number; completed: number }>();
  for (const { date, kind } of events) {
    const key = getBucketKey(date, interval);
    const bucket = counts.get(key) ?? { created: 0, completed: 0 };
    bucket[kind] += 1;
    counts.set(key, bucket);
  }

  const points: DashboardTrendPoint[] = [];
  const first = getBucketKey(range === "all" ? earliest : rangeStart, interval);
  const last = getBucketKey(now, interval);
  for (let key = first; key <= last; key += 1) {
    points.push({
      date: getBucketDate(key, interval, rangeStart).toISOString(),
      label: formatBucketLabel(key, interval),
      ...(counts.get(key) ?? { created: 0, completed: 0 }),
    });
  }
  return { points, intervalLabel: intervalLabels[interval] };
}

function getTrendInterval(range: DashboardAnalyticsRange, first: Date, last: Date): TrendInterval {
  if (range === "today") return "four-hours";
  if (range === "week" || getBucketKey(last, "day") - getBucketKey(first, "day") < 31) return "day";
  return getBucketKey(last, "month") - getBucketKey(first, "month") < 24 ? "month" : "year";
}

function getBucketKey(date: Date, interval: TrendInterval) {
  switch (interval) {
    case "four-hours":
      return Math.floor(date.getHours() / 4);
    case "day":
      return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / dayMilliseconds;
    case "month":
      return date.getFullYear() * 12 + date.getMonth();
    case "year":
      return date.getFullYear();
  }
}

function getBucketDate(key: number, interval: TrendInterval, rangeStart: Date) {
  switch (interval) {
    case "four-hours": {
      const date = new Date(rangeStart);
      date.setHours(key * 4);
      return date;
    }
    case "day":
      return new Date(key * dayMilliseconds);
    case "month":
      return new Date(Date.UTC(Math.floor(key / 12), key % 12, 1));
    case "year":
      return new Date(Date.UTC(key, 0, 1));
  }
}

function formatBucketLabel(key: number, interval: TrendInterval) {
  switch (interval) {
    case "four-hours":
      return `${String(key * 4).padStart(2, "0")}:00`;
    case "day": {
      const date = new Date(key * dayMilliseconds);
      return `${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
    }
    case "month":
      return `${Math.floor(key / 12)}/${String((key % 12) + 1).padStart(2, "0")}`;
    case "year":
      return String(key);
  }
}
