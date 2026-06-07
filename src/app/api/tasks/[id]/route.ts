import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { taskSchema } from "@/features/tasks/schemas/task-schema";
import type { Task } from "@/features/tasks/types/task.types";
import { getCurrentAuthEnvelope } from "@/lib/appwrite/server";
import { getAppwriteSessionSecret } from "@/lib/appwrite/session";
import { deleteTask, getTask, updateTask, updateTaskStatus } from "@/lib/appwrite/tasks";

const taskStatusSchema = z.object({
  status: z.enum(["todo", "in_progress", "done"]),
}).strict();

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const sessionSecret = await getAppwriteSessionSecret();
  const auth = await getCurrentAuthEnvelope();

  if (!sessionSecret || !auth?.user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;
  const currentTask = await getTask(sessionSecret, id, request);

  if (currentTask.assignedTo !== auth.user.id) {
    return NextResponse.json({ message: "Task not found." }, { status: 404 });
  }

  const payload = await request.json().catch(() => null);
  const parsedStatus = taskStatusSchema.safeParse(payload);

  if (parsedStatus.success) {
    const task = await updateTaskStatus(
      sessionSecret,
      id,
      parsedStatus.data.status as Task["status"],
      request,
    );

    return NextResponse.json({ task });
  }

  const parsedTask = taskSchema.safeParse(payload);

  if (!parsedTask.success) {
    return NextResponse.json(
      { message: parsedTask.error.issues[0]?.message ?? "Invalid task payload." },
      { status: 400 },
    );
  }

  const task = await updateTask(sessionSecret, id, parsedTask.data, request);
  return NextResponse.json({ task });
}

function isStatusOnlyPatch(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return false;
  }

  const keys = Object.keys(payload);

  return keys.length === 1 && keys[0] === "status";
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const sessionSecret = await getAppwriteSessionSecret();
  const auth = await getCurrentAuthEnvelope();

  if (!sessionSecret || !auth?.user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;
  const currentTask = await getTask(sessionSecret, id, request);

  if (currentTask.assignedTo !== auth.user.id) {
    return NextResponse.json({ message: "Task not found." }, { status: 404 });
  }

  await deleteTask(sessionSecret, id, request);
  return NextResponse.json({ ok: true });
}
