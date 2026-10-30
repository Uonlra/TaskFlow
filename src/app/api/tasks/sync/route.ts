import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { taskSchema, type TaskFormValues } from "@/features/tasks/schemas/task-schema";
import { taskPrioritySchema, taskStatusSchema } from "@/features/tasks/types/task-values";
import type { Task } from "@/features/tasks/types/task.types";
import { getCurrentAuthEnvelope, AppwriteRequestError } from "@/shared/lib/appwrite/server";
import { getAppwriteSessionSecret } from "@/shared/lib/appwrite/session";
import { createTask, deleteTask, getTask, updateTask } from "@/shared/lib/appwrite/tasks";

const syncDateSchema = z.string().refine((value) => Number.isFinite(Date.parse(value)), "时间格式不正确。");

const syncTaskPayloadSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  status: taskStatusSchema,
  priority: taskPrioritySchema,
  tags: z.union([z.array(z.string()), z.string()]).optional(),
  dueDate: z.string().optional(),
});

const syncOperationSchema = z.object({
  operationId: z.string().min(1),
  accountId: z.string().min(1),
  taskId: z.string().min(1),
  operation: z.enum(["upsert", "delete"]),
  payload: z.unknown(),
  clientUpdatedAt: syncDateSchema,
});

const syncRequestSchema = z.object({
  operations: z.array(syncOperationSchema).min(1).max(50),
});

type SyncOperation = z.infer<typeof syncOperationSchema>;
type SyncResult = {
  operationId: string;
  taskId: string;
  status: "applied" | "stale" | "deleted" | "error";
  task?: Task;
  message?: string;
};

export async function POST(request: NextRequest) {
  const sessionSecret = await getAppwriteSessionSecret();
  const auth = await getCurrentAuthEnvelope();

  if (!sessionSecret || !auth?.user) {
    return NextResponse.json({ message: "请先登录后再同步任务。" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = syncRequestSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "同步数据格式不正确。" }, { status: 400 });
  }

  if (parsed.data.operations.some((operation) => operation.accountId !== auth.user.id)) {
    return NextResponse.json({ message: "同步账户与当前登录账户不匹配。" }, { status: 403 });
  }

  const results: SyncResult[] = [];

  for (const operation of parsed.data.operations) {
    try {
      results.push(await applySyncOperation(sessionSecret, auth.user.id, operation, request));
    } catch {
      results.push({
        operationId: operation.operationId,
        taskId: operation.taskId,
        status: "error",
        message: "同步任务失败，将在下次联网时重试。",
      });
    }
  }

  return NextResponse.json({ results });
}

async function applySyncOperation(
  sessionSecret: string,
  userId: string,
  operation: SyncOperation,
  request: NextRequest,
): Promise<SyncResult> {
  if (operation.operation === "delete") {
    const remote = await findRemoteTask(sessionSecret, operation.taskId, request);

    if (!remote) {
      return { operationId: operation.operationId, taskId: operation.taskId, status: "deleted" };
    }

    if (isRemoteNewer(remote, operation.clientUpdatedAt)) {
      return { operationId: operation.operationId, taskId: operation.taskId, status: "stale", task: remote };
    }

    await deleteTask(sessionSecret, operation.taskId, request);
    return { operationId: operation.operationId, taskId: operation.taskId, status: "deleted" };
  }

  const input = parseTaskPayload(operation.payload, operation.taskId);
  const remote = await findRemoteTask(sessionSecret, operation.taskId, request);

  if (remote && isRemoteNewer(remote, operation.clientUpdatedAt)) {
    return { operationId: operation.operationId, taskId: operation.taskId, status: "stale", task: remote };
  }

  if (remote) {
    const task = await updateTask(sessionSecret, operation.taskId, input, request, operation.clientUpdatedAt);
    return { operationId: operation.operationId, taskId: operation.taskId, status: "applied", task };
  }

  try {
    const task = await createTask(sessionSecret, userId, input, request, operation.taskId, operation.clientUpdatedAt);
    return { operationId: operation.operationId, taskId: operation.taskId, status: "applied", task };
  } catch (error) {
    if (!isConflict(error)) throw error;

    const existing = await findRemoteTask(sessionSecret, operation.taskId, request);
    if (!existing) throw error;
    if (isRemoteNewer(existing, operation.clientUpdatedAt)) {
      return { operationId: operation.operationId, taskId: operation.taskId, status: "stale", task: existing };
    }

    const task = await updateTask(sessionSecret, operation.taskId, input, request, operation.clientUpdatedAt);
    return { operationId: operation.operationId, taskId: operation.taskId, status: "applied", task };
  }
}

function parseTaskPayload(payload: unknown, taskId: string): TaskFormValues {
  const parsed = syncTaskPayloadSchema.safeParse(payload);
  if (!parsed.success || parsed.data.id !== taskId) {
    throw new Error("同步任务内容不正确。");
  }

  const tags = Array.isArray(parsed.data.tags) ? parsed.data.tags.join(", ") : (parsed.data.tags ?? "");
  return taskSchema.parse({ ...parsed.data, tags });
}

async function findRemoteTask(sessionSecret: string, taskId: string, request: NextRequest) {
  try {
    return await getTask(sessionSecret, taskId, request);
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

function isRemoteNewer(remote: Task, clientUpdatedAt: string) {
  if (!remote.updatedAt) return false;
  return Date.parse(remote.syncClientUpdatedAt ?? remote.updatedAt) >= Date.parse(clientUpdatedAt);
}

function isNotFound(error: unknown) {
  return error instanceof AppwriteRequestError && error.status === 404;
}

function isConflict(error: unknown) {
  return error instanceof AppwriteRequestError && error.status === 409;
}
