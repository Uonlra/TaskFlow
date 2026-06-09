import { NextResponse, type NextRequest } from "next/server";

import { taskSchema } from "@/features/tasks/schemas/task-schema";
import { getCurrentAuthEnvelope } from "@/lib/appwrite/server";
import { getAppwriteSessionSecret } from "@/lib/appwrite/session";
import { createTask, listTasks } from "@/lib/appwrite/tasks";

export async function GET(request: NextRequest) {
  const sessionSecret = await getAppwriteSessionSecret();
  const auth = await getCurrentAuthEnvelope();

  if (!sessionSecret || !auth?.user) {
    return NextResponse.json({ message: "请先登录后再查看任务。" }, { status: 401 });
  }

  const tasks = await listTasks(sessionSecret, auth.user.id, request);
  return NextResponse.json({ tasks });
}

export async function POST(request: NextRequest) {
  const sessionSecret = await getAppwriteSessionSecret();
  const auth = await getCurrentAuthEnvelope();

  if (!sessionSecret || !auth?.user) {
    return NextResponse.json({ message: "请先登录后再创建任务。" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = taskSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "任务信息格式不正确。" },
      { status: 400 },
    );
  }

  const task = await createTask(sessionSecret, auth.user.id, parsed.data, request);
  return NextResponse.json({ task }, { status: 201 });
}
