import "server-only";

import type { NextRequest } from "next/server";

import type { TaskFormValues } from "@/features/tasks/schemas/task-schema";
import type { Task } from "@/features/tasks/types/task.types";
import {
  appwriteDatabaseId,
  appwriteEndpoint,
  appwriteProjectId,
  appwriteTasksTableId,
  hasAppwriteDatabaseEnv,
} from "@/lib/appwrite/env";
import { AppwriteRequestError } from "@/lib/appwrite/server";

type AppwriteTaskRow = {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  title: string;
  description: string;
  status: Task["status"];
  priority: Task["priority"];
  tags?: string[] | null;
  dueDate?: string | null;
  completedAt?: string | null;
  taskName?: string | null;
  taskId?: number | null;
  assignedTo?: string | null;
};

type AppwriteRowsList = {
  rows: AppwriteTaskRow[];
};

export async function listTasks(
  sessionSecret: string,
  userId: string,
  request?: NextRequest,
) {
  const payload = await appwriteTaskRequest<AppwriteRowsList>("", {
    sessionSecret,
    request,
    searchParams: {
      "queries[]": [`equal("assignedTo",${JSON.stringify(userId)})`],
    },
  });

  return (payload.rows ?? []).map(mapTaskRow);
}

export async function createTask(
  sessionSecret: string,
  userId: string,
  input: TaskFormValues,
  request?: NextRequest,
) {
  const rowId = crypto.randomUUID();
  const taskKey = Date.now();
  const row = await appwriteTaskRequest<AppwriteTaskRow>("", {
    method: "POST",
    sessionSecret,
    request,
    body: {
      rowId,
      data: buildTaskData(input, taskKey, userId),
      permissions: buildTaskPermissions(userId),
    },
  });

  return mapTaskRow(row);
}

export async function updateTask(
  sessionSecret: string,
  taskId: string,
  input: TaskFormValues,
  request?: NextRequest,
) {
  const row = await appwriteTaskRequest<AppwriteTaskRow>(`/${taskId}`, {
    method: "PATCH",
    sessionSecret,
    request,
    body: {
      data: buildTaskData(input),
    },
  });

  return mapTaskRow(row);
}

export async function updateTaskStatus(
  sessionSecret: string,
  taskId: string,
  status: Task["status"],
  request?: NextRequest,
) {
  const row = await appwriteTaskRequest<AppwriteTaskRow>(`/${taskId}`, {
    method: "PATCH",
    sessionSecret,
    request,
    body: {
      data: {
        status,
        completedAt: status === "done" ? new Date().toISOString() : null,
      },
    },
  });

  return mapTaskRow(row);
}

export async function deleteTask(
  sessionSecret: string,
  taskId: string,
  request?: NextRequest,
) {
  await appwriteTaskRequest(`/${taskId}`, {
    method: "DELETE",
    sessionSecret,
    request,
  });
}

export async function getTask(
  sessionSecret: string,
  taskId: string,
  request?: NextRequest,
) {
  const row = await appwriteTaskRequest<AppwriteTaskRow>(`/${taskId}`, {
    sessionSecret,
    request,
  });

  return row;
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
  return [
    `read("user:${userId}")`,
    `update("user:${userId}")`,
    `delete("user:${userId}")`,
  ];
}

function buildTaskData(
  input: TaskFormValues,
  taskKey?: number,
  userId?: string,
) {
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
    status: input.status,
    priority: input.priority,
    tags,
    dueDate: toAppwriteDateTime(input.dueDate),
    completedAt: input.status === "done" ? new Date().toISOString() : null,
    ...(typeof taskKey === "number" ? { taskId: taskKey } : {}),
    ...(userId ? { assignedTo: userId } : {}),
  };
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

async function appwriteTaskRequest<T = unknown>(
  path: string,
  options: {
    method?: "GET" | "POST" | "PATCH" | "DELETE";
    sessionSecret: string;
    body?: unknown;
    request?: NextRequest;
    searchParams?: Record<string, string | string[]>;
  },
) {
  if (
    !hasAppwriteDatabaseEnv ||
    !appwriteEndpoint ||
    !appwriteProjectId ||
    !appwriteDatabaseId ||
    !appwriteTasksTableId
  ) {
    throw new Error("Appwrite database configuration is incomplete.");
  }

  const url = new URL(
    `${appwriteEndpoint.replace(/\/$/, "")}/tablesdb/${appwriteDatabaseId}/tables/${appwriteTasksTableId}/rows${path}`,
  );

  if (options.searchParams) {
    for (const [key, rawValue] of Object.entries(options.searchParams)) {
      const values = Array.isArray(rawValue) ? rawValue : [rawValue];

      values.forEach((value) => {
        url.searchParams.append(key, value);
      });
    }
  }

  const headers = new Headers({
    "Content-Type": "application/json",
    "X-Appwrite-Project": appwriteProjectId,
    "X-Appwrite-Response-Format": "1.8.0",
    "X-Appwrite-Session": options.sessionSecret,
  });

  const userAgent = options.request?.headers.get("user-agent");

  if (userAgent) {
    headers.set("X-Forwarded-User-Agent", userAgent);
  }

  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorPayload = (await safeJson<{ message?: string }>(response)) ?? {};
    throw new AppwriteRequestError(
      response.status,
      errorPayload.message || `Task request failed with status ${response.status}.`,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function safeJson<T>(response: Response) {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}
