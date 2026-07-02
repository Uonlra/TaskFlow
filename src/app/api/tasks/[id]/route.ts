import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { taskSchema } from "@/features/tasks/schemas/task-schema";
import type { Task } from "@/features/tasks/types/task.types";
import { handleApiError } from "@/lib/api/error";
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
    return NextResponse.json({ message: "请先登录后再修改任务。" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const currentTask = await getTask(sessionSecret, id, request);

    if (currentTask.assignedTo !== auth.user.id) {
      return NextResponse.json({ message: "没有找到这条任务。" }, { status: 404 });
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
        { message: parsedTask.error.issues[0]?.message ?? "任务信息格式不正确。" },
        { status: 400 },
      );
    }

    const task = await updateTask(sessionSecret, id, parsedTask.data, request);
    return NextResponse.json({ task });
  } catch (error) {
    return handleApiError(error, "更新任务失败，请稍后再试。");
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const sessionSecret = await getAppwriteSessionSecret();
  const auth = await getCurrentAuthEnvelope();

  if (!sessionSecret || !auth?.user) {
    return NextResponse.json({ message: "请先登录后再删除任务。" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const currentTask = await getTask(sessionSecret, id, request);

    if (currentTask.assignedTo !== auth.user.id) {
      return NextResponse.json({ message: "没有找到这条任务。" }, { status: 404 });
    }

    await deleteTask(sessionSecret, id, request);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error, "删除任务失败，请稍后再试。");
  }
}
