import "server-only";

import { z } from "zod";
import type { NextRequest } from "next/server";

import type { TaskFormValues } from "@/features/tasks/schemas/task-schema";
import type { Task } from "@/features/tasks/types/task.types";
import type { TaskFilters } from "@/features/tasks/types/task-filters";
import type { DashboardAnalyticsRange } from "@/features/tasks/utils/task-analytics";
import {
  addTaskDays,
  formatTaskDateParam,
  getTaskWeekStart,
  parseTaskDateParam,
  startOfTaskDay,
} from "@/features/tasks/utils/task-date-filters";
import { TASK_DUE_FILTERS, DASHBOARD_RANGE_VALUES } from "@/shared/lib/constants/query-params";
import {
  DEFAULT_TASK_PAGE_SIZE,
  MAX_TASK_PAGE_SIZE,
  type TaskPageResult,
} from "@/features/tasks/utils/task-list-query";
import { appwriteDatabaseId, appwriteTasksTableId, hasAppwriteDatabaseEnv } from "@/shared/lib/appwrite/env";
import { appwriteFetch } from "@/shared/lib/appwrite/request";
import {
  appwriteRowsListSchema,
  appwriteTaskRowSchema,
  type AppwriteRowsList,
  type AppwriteTaskRow,
} from "@/shared/lib/appwrite/schemas/task-row.schema";

const CALENDAR_QUERY_LIMIT = 5000;

export async function listTasks(sessionSecret: string, request?: NextRequest) {
  const payload = await appwriteTaskRequest<AppwriteRowsList>(
    "",
    {
      sessionSecret,
      request,
    },
    appwriteRowsListSchema,
  );

  return (payload.rows ?? []).map(mapTaskRow);
}

const DASHBOARD_QUERY_LIMIT = 5000;
const DASHBOARD_SELECT_FIELDS = [
  "$id",
  "$createdAt",
  "$updatedAt",
  "title",
  "taskName",
  "description",
  "status",
  "priority",
  "tags",
  "dueDate",
  "completedAt",
];

export async function listTasksForDashboard(
  sessionSecret: string,
  range: DashboardAnalyticsRange,
  request?: NextRequest,
) {
  const scopeQueries = range === "all" ? [] : buildDashboardRangeQueries(range);
  const [scopedPayload, pacePayload, anyTaskPayload] = await Promise.all([
    appwriteTaskRequest<AppwriteRowsList>(
      "",
      {
        sessionSecret,
        request,
        searchParams: {
          queries: [...scopeQueries, querySelect(DASHBOARD_SELECT_FIELDS), queryLimit(DASHBOARD_QUERY_LIMIT)],
        },
      },
      appwriteRowsListSchema,
    ),
    appwriteTaskRequest<AppwriteRowsList>(
      "",
      {
        sessionSecret,
        request,
        searchParams: {
          queries: [
            ...buildDashboardPaceQueries(),
            querySelect(DASHBOARD_SELECT_FIELDS),
            queryLimit(DASHBOARD_QUERY_LIMIT),
          ],
        },
      },
      appwriteRowsListSchema,
    ),
    appwriteTaskRequest<AppwriteRowsList>(
      "",
      {
        sessionSecret,
        request,
        searchParams: { queries: [queryLimit(1)] },
      },
      appwriteRowsListSchema,
    ),
  ]);

  return {
    tasks: (scopedPayload.rows ?? []).map(mapTaskRow),
    paceTasks: (pacePayload.rows ?? []).map(mapTaskRow),
    hasAnyTasks: getRowsTotal(anyTaskPayload) > 0,
  };
}

function buildDashboardRangeQueries(range: Exclude<DashboardAnalyticsRange, "all">) {
  const start = startOfTaskDay(new Date());
  const end = addTaskDays(start, range === "today" ? 1 : 7);
  const timestampFields = ["$createdAt", "$updatedAt", "completedAt"];
  const timestampQueries = timestampFields.map((field) =>
    buildDateRangeQuery(field, start.toISOString(), end.toISOString()),
  );
  const dueQueries = buildDateRangeQuery(
    "dueDate",
    toAppwriteDateTime(formatTaskDateParam(start)) as string,
    toAppwriteDateTime(formatTaskDateParam(end)) as string,
  );

  return [queryOr([...timestampQueries, dueQueries])];
}

function buildDateRangeQuery(attribute: string, from: string, to: string) {
  return queryAnd([queryGreaterThanEqual(attribute, from), queryLessThan(attribute, to)]);
}

function buildDashboardPaceQueries() {
  const today = startOfTaskDay(new Date());
  const tomorrow = addTaskDays(today, 1);
  const todayStart = today.toISOString();
  const tomorrowStart = tomorrow.toISOString();
  const todayDue = toAppwriteDateTime(formatTaskDateParam(today)) as string;
  const tomorrowDue = toAppwriteDateTime(formatTaskDateParam(tomorrow)) as string;

  return [
    queryOr([
      queryAnd([
        queryEqual("status", "done"),
        queryGreaterThanEqual("completedAt", todayStart),
        queryLessThan("completedAt", tomorrowStart),
      ]),
      queryEqual("status", "in_progress"),
      queryAnd([queryNotEqual("status", "done"), queryLessThan("dueDate", todayDue)]),
      queryAnd([
        queryNotEqual("status", "done"),
        queryGreaterThanEqual("dueDate", todayDue),
        queryLessThan("dueDate", tomorrowDue),
      ]),
    ]),
  ];
}

/**
 * Returns a page directly from Appwrite. Filters that depend on array search,
 * derived risk rules, or custom priority ranking are intentionally handled by
 * the legacy in-memory path so their existing semantics remain unchanged.
 */
export async function listTasksPage(
  sessionSecret: string,
  filters: TaskFilters,
  page = 1,
  pageSize = DEFAULT_TASK_PAGE_SIZE,
  request?: NextRequest,
): Promise<TaskPageResult> {
  const normalizedPage = Math.max(1, Math.floor(page));
  const normalizedPageSize = Math.min(MAX_TASK_PAGE_SIZE, Math.max(1, Math.floor(pageSize)));
  const countsPromise = getTaskCategoryCounts(sessionSecret, request);
  const baseQueries = buildTaskPageQueries(filters);

  let payload = await fetchTaskPage(sessionSecret, baseQueries, normalizedPage, normalizedPageSize, request);
  const total = getRowsTotal(payload);
  const totalPages = Math.max(1, Math.ceil(total / normalizedPageSize));
  const safePage = Math.min(normalizedPage, totalPages);

  if (safePage !== normalizedPage) {
    payload = await fetchTaskPage(sessionSecret, baseQueries, safePage, normalizedPageSize, request);
  }

  return {
    tasks: (payload.rows ?? []).map(mapTaskRow),
    total,
    page: safePage,
    pageSize: normalizedPageSize,
    hasNext: safePage < totalPages,
    categoryCounts: await countsPromise,
  };
}

export function canUseAppwriteTaskPage(filters: TaskFilters) {
  return !filters.risk && filters.sort !== "priority_desc";
}

export function buildTaskPageQueries(filters: TaskFilters) {
  const queries: string[] = [];

  if (filters.status === "active") {
    queries.push(queryNotEqual("status", "done"));
  } else if (filters.status !== "all") {
    queries.push(queryEqual("status", filters.status));
  }

  if (filters.priority !== "all") {
    queries.push(queryEqual("priority", filters.priority));
  }

  if (filters.query.trim()) {
    queries.push(querySearch("searchText", filters.query.trim()));
  }

  if (filters.tag.trim()) {
    queries.push(querySearch("searchText", filters.tag.trim()));
  }

  appendDateFilters(queries, filters);

  if (filters.sort === "created_desc") {
    queries.push(queryOrderDesc("$createdAt"));
  } else if (filters.sort === "updated_desc") {
    queries.push(queryOrderDesc("$updatedAt"));
  } else {
    queries.push(queryOrderAsc("dueDate"));
  }

  return queries;
}

async function fetchTaskPage(
  sessionSecret: string,
  baseQueries: string[],
  page: number,
  pageSize: number,
  request?: NextRequest,
) {
  return appwriteTaskRequest<AppwriteRowsList>(
    "",
    {
      sessionSecret,
      request,
      searchParams: {
        queries: [...baseQueries, queryOffset((page - 1) * pageSize), queryLimit(pageSize)],
      },
    },
    appwriteRowsListSchema,
  );
}

async function getTaskCategoryCounts(sessionSecret: string, request?: NextRequest) {
  const today = startOfTaskDay(new Date());
  const nearEnd = addTaskDays(today, 4);
  const [all, active, done, near] = await Promise.all([
    countTaskRows(sessionSecret, [], request),
    countTaskRows(sessionSecret, [queryNotEqual("status", "done")], request),
    countTaskRows(sessionSecret, [queryEqual("status", "done")], request),
    countTaskRows(
      sessionSecret,
      [
        queryNotEqual("status", "done"),
        queryGreaterThanEqual("dueDate", toAppwriteDateTime(formatTaskDateParam(today)) as string),
        queryLessThan("dueDate", toAppwriteDateTime(formatTaskDateParam(nearEnd)) as string),
      ],
      request,
    ),
  ]);

  return { all, active, done, near };
}

async function countTaskRows(sessionSecret: string, queries: string[], request?: NextRequest) {
  const payload = await appwriteTaskRequest<AppwriteRowsList>(
    "",
    {
      sessionSecret,
      request,
      searchParams: { queries: [...queries, queryLimit(1)] },
    },
    appwriteRowsListSchema,
  );

  return getRowsTotal(payload);
}

function getRowsTotal(payload: AppwriteRowsList) {
  return payload.total ?? payload.rows?.length ?? 0;
}

function appendDateFilters(queries: string[], filters: TaskFilters) {
  const range = getTaskDateRange(filters);

  if (range === "all") {
    queries.push(queryIsNotNull("dueDate"));
  } else if (range) {
    queries.push(
      queryGreaterThanEqual("dueDate", toAppwriteDateTime(range.from) as string),
      queryLessThan("dueDate", toAppwriteDateTime(range.to) as string),
    );
  }

  if (filters.due === TASK_DUE_FILTERS.overdue) {
    queries.push(
      queryLessThan("dueDate", toAppwriteDateTime(formatTaskDateParam(startOfTaskDay(new Date()))) as string),
    );
    queries.push(queryNotEqual("status", "done"));
  } else if (filters.due === TASK_DUE_FILTERS.today) {
    const today = startOfTaskDay(new Date());
    queries.push(
      queryGreaterThanEqual("dueDate", toAppwriteDateTime(formatTaskDateParam(today)) as string),
      queryLessThan("dueDate", toAppwriteDateTime(formatTaskDateParam(addTaskDays(today, 1))) as string),
      queryNotEqual("status", "done"),
    );
  } else if (filters.due === TASK_DUE_FILTERS.upcoming) {
    const today = startOfTaskDay(new Date());
    queries.push(
      queryGreaterThanEqual("dueDate", toAppwriteDateTime(formatTaskDateParam(addTaskDays(today, 1))) as string),
      queryLessThan("dueDate", toAppwriteDateTime(formatTaskDateParam(addTaskDays(today, 4))) as string),
      queryNotEqual("status", "done"),
    );
  } else if (filters.due === TASK_DUE_FILTERS.near) {
    const today = startOfTaskDay(new Date());
    queries.push(
      queryGreaterThanEqual("dueDate", toAppwriteDateTime(formatTaskDateParam(today)) as string),
      queryLessThan("dueDate", toAppwriteDateTime(formatTaskDateParam(addTaskDays(today, 4))) as string),
      queryNotEqual("status", "done"),
    );
  }
}

function getTaskDateRange(filters: TaskFilters) {
  if (filters.range === DASHBOARD_RANGE_VALUES.all) return "all" as const;

  const selected = parseTaskDateParam(filters.date) ?? startOfTaskDay(new Date());
  if (filters.range === DASHBOARD_RANGE_VALUES.week) {
    const from = getTaskWeekStart(selected);
    return { from: formatTaskDateParam(from), to: formatTaskDateParam(addTaskDays(from, 7)) };
  }

  if (filters.range === DASHBOARD_RANGE_VALUES.today || filters.date) {
    return { from: formatTaskDateParam(selected), to: formatTaskDateParam(addTaskDays(selected, 1)) };
  }

  return null;
}

export async function listTasksByDueRange(
  sessionSecret: string,
  range: { from?: string; to?: string; all?: boolean },
  request?: NextRequest,
) {
  const dueQueries = [queryIsNotNull("dueDate")];

  if (!range.all && range.from) {
    dueQueries.push(queryGreaterThanEqual("dueDate", toAppwriteDateTime(range.from) as string));
  }

  if (!range.all && range.to) {
    dueQueries.push(queryLessThan("dueDate", toAppwriteDateTime(range.to) as string));
  }

  dueQueries.push(queryOrderAsc("dueDate"), queryLimit(CALENDAR_QUERY_LIMIT));

  const [duePayload, anyTaskPayload] = await Promise.all([
    appwriteTaskRequest<AppwriteRowsList>(
      "",
      {
        sessionSecret,
        request,
        searchParams: { queries: dueQueries },
      },
      appwriteRowsListSchema,
    ),
    appwriteTaskRequest<AppwriteRowsList>(
      "",
      {
        sessionSecret,
        request,
        searchParams: { queries: [queryLimit(1)] },
      },
      appwriteRowsListSchema,
    ),
  ]);

  return {
    tasks: (duePayload.rows ?? []).map(mapTaskRow),
    hasAnyTasks: (anyTaskPayload.total ?? anyTaskPayload.rows?.length ?? 0) > 0,
  };
}

export async function createTask(sessionSecret: string, userId: string, input: TaskFormValues, request?: NextRequest) {
  const rowId = crypto.randomUUID();
  const taskKey = Date.now();
  const row = await appwriteTaskRequest<AppwriteTaskRow>(
    "",
    {
      method: "POST",
      sessionSecret,
      request,
      body: {
        rowId,
        data: buildTaskData(input, taskKey),
        permissions: buildTaskPermissions(userId),
      },
    },
    appwriteTaskRowSchema,
  );

  return mapTaskRow(row);
}

export async function updateTask(sessionSecret: string, taskId: string, input: TaskFormValues, request?: NextRequest) {
  const row = await appwriteTaskRequest<AppwriteTaskRow>(
    `/${taskId}`,
    {
      method: "PATCH",
      sessionSecret,
      request,
      body: {
        data: buildTaskData(input),
      },
    },
    appwriteTaskRowSchema,
  );

  return mapTaskRow(row);
}

export async function updateTaskStatus(
  sessionSecret: string,
  taskId: string,
  status: Task["status"],
  request?: NextRequest,
) {
  const row = await appwriteTaskRequest<AppwriteTaskRow>(
    `/${taskId}`,
    {
      method: "PATCH",
      sessionSecret,
      request,
      body: {
        data: {
          status,
          completedAt: status === "done" ? new Date().toISOString() : null,
        },
      },
    },
    appwriteTaskRowSchema,
  );

  return mapTaskRow(row);
}

export async function deleteTask(sessionSecret: string, taskId: string, request?: NextRequest) {
  await appwriteTaskRequest(`/${taskId}`, {
    method: "DELETE",
    sessionSecret,
    request,
  });
}

export async function getTask(sessionSecret: string, taskId: string, request?: NextRequest) {
  const row = await appwriteTaskRequest<AppwriteTaskRow>(
    `/${taskId}`,
    {
      sessionSecret,
      request,
    },
    appwriteTaskRowSchema,
  );

  return mapTaskRow(row);
}

export function mapTaskRow(row: AppwriteTaskRow): Task {
  return {
    id: row.$id,
    title: row.title || row.taskName || "",
    description: row.description,
    status: row.status,
    priority: row.priority,
    tags: row.tags ?? [],
    dueDate: normalizeDateOnly(row.dueDate),
    createdAt: row.$createdAt,
    updatedAt: row.$updatedAt,
    completedAt: row.completedAt ?? undefined,
  };
}

function buildTaskPermissions(userId: string) {
  return [`read("user:${userId}")`, `update("user:${userId}")`, `delete("user:${userId}")`];
}

function buildTaskData(input: TaskFormValues, taskKey?: number) {
  const tags = Array.from(
    new Set(
      (input.tags ?? "")
        .split(/[，,]/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );

  return {
    title: input.title,
    taskName: input.title,
    description: input.description,
    searchText: buildTaskSearchText(input.title, input.description, tags),
    status: input.status,
    priority: input.priority,
    tags,
    dueDate: toAppwriteDateTime(input.dueDate),
    completedAt: input.status === "done" ? new Date().toISOString() : null,
    ...(typeof taskKey === "number" ? { taskId: taskKey } : {}),
  };
}

export function buildTaskSearchText(title: string, description: string, tags: string[]) {
  return [title, description, ...tags]
    .map((value) => value.trim())
    .filter(Boolean)
    .join(" ");
}

function toAppwriteDateTime(value?: string) {
  if (!value) {
    return null;
  }

  return `${value}T00:00:00.000Z`;
}

function normalizeDateOnly(value?: string | null) {
  if (!value) {
    return undefined;
  }

  return value.slice(0, 10);
}

function queryIsNotNull(attribute: string) {
  return buildQuery("isNotNull", attribute);
}

function queryEqual(attribute: string, value: string) {
  return buildQuery("equal", attribute, value);
}

function queryNotEqual(attribute: string, value: string) {
  return buildQuery("notEqual", attribute, value);
}

function querySearch(attribute: string, value: string) {
  return buildQuery("search", attribute, value);
}

function querySelect(attributes: string[]) {
  return JSON.stringify({ method: "select", values: attributes });
}

function queryOr(queries: string[]) {
  return JSON.stringify({ method: "or", values: queries.map((value) => JSON.parse(value)) });
}

function queryAnd(queries: string[]) {
  return JSON.stringify({ method: "and", values: queries.map((value) => JSON.parse(value)) });
}

function queryGreaterThanEqual(attribute: string, value: string) {
  return buildQuery("greaterThanEqual", attribute, value);
}

function queryLessThan(attribute: string, value: string) {
  return buildQuery("lessThan", attribute, value);
}

function queryOffset(value: number) {
  return buildQuery("offset", undefined, value);
}

function queryOrderAsc(attribute: string) {
  return buildQuery("orderAsc", attribute);
}

function queryOrderDesc(attribute: string) {
  return buildQuery("orderDesc", attribute);
}

function queryLimit(value: number) {
  return buildQuery("limit", undefined, value);
}

function buildQuery(method: string, attribute?: string, value?: string | number) {
  return JSON.stringify({
    method,
    ...(attribute === undefined ? {} : { attribute }),
    ...(value === undefined ? {} : { values: [value] }),
  });
}

async function appwriteTaskRequest<T = unknown>(
  path: string,
  options: {
    method?: "GET" | "POST" | "PATCH" | "DELETE";
    sessionSecret: string;
    body?: unknown;
    request?: NextRequest;
    searchParams?: Record<string, string | string[]>;
  },
  schema?: z.ZodType<T>,
) {
  if (!hasAppwriteDatabaseEnv || !appwriteDatabaseId || !appwriteTasksTableId) {
    throw new Error("Appwrite database configuration is incomplete.");
  }

  const payload = await appwriteFetch<unknown>({
    path: `/tablesdb/${appwriteDatabaseId}/tables/${appwriteTasksTableId}/rows${path}`,
    method: options.method,
    body: options.body,
    sessionSecret: options.sessionSecret,
    request: options.request,
    searchParams: options.searchParams as Record<string, string | number | boolean | Array<string>> | undefined,
    errorMessage: "Task request failed.",
  });

  return schema ? schema.parse(payload) : (payload as T);
}
