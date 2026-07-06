import { ROUTES } from "@/lib/constants/routes";

export const TASK_QUERY_KEYS = {
  query: "query",
  tag: "tag",
  status: "status",
  priority: "priority",
  sort: "sort",
  due: "due",
  risk: "risk",
} as const;

export const TASK_DUE_FILTERS = {
  today: "today",
  upcoming: "upcoming",
  overdue: "overdue",
} as const;

export const TASK_RISK_FILTERS = {
  overdue: "overdue",
  high: "high",
  medium: "medium",
  low: "low",
} as const;

export const STATS_QUERY_KEYS = {
  range: "range",
} as const;

export const CALENDAR_QUERY_KEYS = {
  date: "date",
  range: "range",
} as const;

export const DASHBOARD_RANGE_VALUES = {
  today: "today",
  week: "week",
  all: "all",
} as const;

export type TaskDueFilter = (typeof TASK_DUE_FILTERS)[keyof typeof TASK_DUE_FILTERS];
export type TaskRiskFilter = (typeof TASK_RISK_FILTERS)[keyof typeof TASK_RISK_FILTERS];
export type DashboardRangeValue = (typeof DASHBOARD_RANGE_VALUES)[keyof typeof DASHBOARD_RANGE_VALUES];

export type BuildTasksHrefInput = {
  query?: string;
  tag?: string;
  status?: "todo" | "in_progress" | "done" | "all";
  priority?: "high" | "medium" | "low" | "all";
  sort?: "created_desc" | "updated_desc" | "due_asc" | "priority_desc";
  due?: TaskDueFilter;
  risk?: TaskRiskFilter;
};

export type BuildStatsHrefInput = {
  range?: DashboardRangeValue;
};

export type BuildCalendarHrefInput = {
  date?: string;
  range?: DashboardRangeValue;
};

export function buildTasksHref(input: BuildTasksHrefInput = {}) {
  return buildHref(ROUTES.tasks, input);
}

export function buildStatsHref(input: BuildStatsHrefInput = {}) {
  return buildHref(ROUTES.stats, input);
}

export function buildCalendarHref(input: BuildCalendarHrefInput = {}) {
  return buildHref(ROUTES.calendar, input);
}

function buildHref(pathname: string, params: object) {
  const searchParams = new URLSearchParams();

  Object.entries(params as Record<string, string | undefined>).forEach(([key, value]) => {
    if (value && value !== "all") {
      searchParams.set(key, value);
    }
  });

  const query = searchParams.toString();

  return query ? `${pathname}?${query}` : pathname;
}
