import { NextResponse, type NextRequest } from "next/server";

import { buildFocusTasks, buildDashboardStats } from "@/features/tasks/utils/task-analytics";
import type { DashboardAnalyticsRange } from "@/features/tasks/utils/task-analytics";
import type { Task, TaskPriority, TaskStatus } from "@/features/tasks/types/task.types";
import { matchesTaskDueFilter } from "@/features/tasks/utils/task-deadline";
import { handleApiError } from "@/shared/lib/api/error";
import { getCurrentAuthEnvelope } from "@/shared/lib/appwrite/server";
import { getAppwriteSessionSecret } from "@/shared/lib/appwrite/session";
import { listTasksForDashboard } from "@/shared/lib/appwrite/tasks";
import type { TaskDueFilter } from "@/shared/lib/constants/query-params";

export async function GET(request: NextRequest) {
  const sessionSecret = await getAppwriteSessionSecret();
  const auth = await getCurrentAuthEnvelope();

  if (!sessionSecret || !auth?.user) {
    return NextResponse.json({ message: "请先登录后再查看总览。" }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const range = parseRange(searchParams.get("range"));
    const status = parseStatus(searchParams.get("status"));
    const priority = parsePriority(searchParams.get("priority"));
    const due = parseDue(searchParams.get("due"));
    const result = await listTasksForDashboard(sessionSecret, range, request);
    const stats = buildDashboardStats(mergeTasks(result.tasks, result.paceTasks), { range });
    const focusCandidates = result.tasks.filter(
      (task) =>
        (status === "all" || task.status === status) &&
        (priority === "all" || task.priority === priority) &&
        (!due || matchesTaskDueFilter(task, due)),
    );

    stats.focusTasks = buildFocusTasks(focusCandidates, { includeCompleted: status === "done" });

    return NextResponse.json({ stats, hasAnyTasks: result.hasAnyTasks });
  } catch (error) {
    return handleApiError(error, "无法加载总览数据，请稍后再试。");
  }
}

function mergeTasks(scopedTasks: Task[], paceTasks: Task[]) {
  const merged = new Map(scopedTasks.map((task) => [task.id, task]));

  paceTasks.forEach((task) => merged.set(task.id, task));

  return Array.from(merged.values());
}

function parseRange(value: string | null): DashboardAnalyticsRange {
  return value === "week" || value === "all" ? value : "today";
}

function parseStatus(value: string | null): TaskStatus | "all" {
  return value === "todo" || value === "in_progress" || value === "done" ? value : "all";
}

function parsePriority(value: string | null): TaskPriority | "all" {
  return value === "low" || value === "medium" || value === "high" ? value : "all";
}

function parseDue(value: string | null): TaskDueFilter | "" {
  return value === "near" || value === "today" || value === "upcoming" || value === "overdue" ? value : "";
}
