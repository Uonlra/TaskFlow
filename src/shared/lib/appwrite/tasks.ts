import "server-only";

import type { NextRequest } from "next/server";

import type { TaskFormValues } from "@/features/tasks/schemas/task-schema";
import type { Task } from "@/features/tasks/types/task.types";
import { appwriteDatabaseId, appwriteTasksTableId, hasAppwriteDatabaseEnv } from "@/shared/lib/appwrite/env";
import { appwriteFetch } from "@/shared/lib/appwrite/request";

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

export async function listTasks(sessionSecret: string, request?: NextRequest) {
  const payload = await appwriteTaskRequest<AppwriteRowsList>("", {
    sessionSecret,
    request,
  });

  return (payload.rows ?? []).map(mapTaskRow);
}

export async function createTask(sessionSecret: string, userId: string, input: TaskFormValues, request?: NextRequest) {
  const rowId = crypto.randomUUID();
  const taskKey = Date.now();
  const row = await appwriteTaskRequest<AppwriteTaskRow>("", {
    method: "POST",
    sessionSecret,
    request,
    body: {
      rowId,
      data: buildTaskData(input, taskKey),
      permissions: buildTaskPermissions(userId),
    },
  });

  return mapTaskRow(row);
}

export async function updateTask(sessionSecret: string, taskId: string, input: TaskFormValues, request?: NextRequest) {
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

export async function deleteTask(sessionSecret: string, taskId: string, request?: NextRequest) {
  await appwriteTaskRequest(`/${taskId}`, {
    method: "DELETE",
    sessionSecret,
    request,
  });
}

export async function getTask(sessionSecret: string, taskId: string, request?: NextRequest) {
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
    status: input.status,
    priority: input.priority,
    tags,
    dueDate: toAppwriteDateTime(input.dueDate),
    completedAt: input.status === "done" ? new Date().toISOString() : null,
    ...(typeof taskKey === "number" ? { taskId: taskKey } : {}),
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
  if (!hasAppwriteDatabaseEnv || !appwriteDatabaseId || !appwriteTasksTableId) {
    throw new Error("Appwrite database configuration is incomplete.");
  }

  return appwriteFetch<T>({
    path: `/tablesdb/${appwriteDatabaseId}/tables/${appwriteTasksTableId}/rows${path}`,
    method: options.method,
    body: options.body,
    sessionSecret: options.sessionSecret,
    request: options.request,
    searchParams: options.searchParams as Record<string, string | number | boolean | Array<string>> | undefined,
    errorMessage: "Task request failed.",
  });
}
