import { NextResponse, type NextRequest } from "next/server";

import { parseTaskDateParam } from "@/features/tasks/utils/task-date-filters";
import { handleApiError } from "@/shared/lib/api/error";
import { getCurrentAuthEnvelope } from "@/shared/lib/appwrite/server";
import { getAppwriteSessionSecret } from "@/shared/lib/appwrite/session";
import { listTasksByDueRange } from "@/shared/lib/appwrite/tasks";

export async function GET(request: NextRequest) {
  const sessionSecret = await getAppwriteSessionSecret();
  const auth = await getCurrentAuthEnvelope();

  if (!sessionSecret || !auth?.user) {
    return NextResponse.json({ message: "请先登录后再查看日历任务。" }, { status: 401 });
  }

  try {
    const range = request.nextUrl.searchParams.get("range");
    const from = normalizeDate(request.nextUrl.searchParams.get("from"));
    const to = normalizeDate(request.nextUrl.searchParams.get("to"));
    const result = await listTasksByDueRange(
      sessionSecret,
      range === "all" ? { all: true } : { from: from ?? undefined, to: to ?? undefined },
      request,
    );

    return NextResponse.json({
      tasks: result.tasks,
      hasAnyTasks: result.hasAnyTasks,
      attention: result.attention,
      from: from ?? null,
      to: to ?? null,
      range: range === "all" ? "all" : "bounded",
    });
  } catch (error) {
    return handleApiError(error, "无法加载日历任务，请稍后再试。");
  }
}

function normalizeDate(value: string | null) {
  return parseTaskDateParam(value) ? value : null;
}
