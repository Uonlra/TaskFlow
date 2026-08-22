import { NextResponse, type NextRequest } from "next/server";

import { taskSchema } from "@/features/tasks/schemas/task-schema";
import { handleApiError } from "@/shared/lib/api/error";
import { getCurrentAuthEnvelope } from "@/shared/lib/appwrite/server";
import { getAppwriteSessionSecret } from "@/shared/lib/appwrite/session";
import { createTask, listTasks } from "@/shared/lib/appwrite/tasks";
import { getTaskPage, parseTaskFiltersFromParams, parseTaskPageParam } from "@/features/tasks/utils/task-list-query";

export async function GET(request: NextRequest) {
  const sessionSecret = await getAppwriteSessionSecret();
  const auth = await getCurrentAuthEnvelope();

  if (!sessionSecret || !auth?.user) {
    return NextResponse.json({ message: "请先登录后再查看任务。" }, { status: 401 });
  }

  try {
    const tasks = await listTasks(sessionSecret, request);
    if (request.nextUrl.searchParams.has("page")) {
      const page = getTaskPage(
        tasks,
        parseTaskFiltersFromParams(request.nextUrl.searchParams),
        parseTaskPageParam(request.nextUrl.searchParams.get("page")),
        Number(request.nextUrl.searchParams.get("limit")) || undefined,
      );
      return NextResponse.json(page);
    }

    return NextResponse.json({ tasks });
  } catch (error) {
    return handleApiError(error, "无法加载任务列表，请稍后再试。");
  }
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
    return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "任务信息格式不正确。" }, { status: 400 });
  }

  try {
    const task = await createTask(sessionSecret, auth.user.id, parsed.data, request);
    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "创建任务失败，请稍后再试。");
  }
}
