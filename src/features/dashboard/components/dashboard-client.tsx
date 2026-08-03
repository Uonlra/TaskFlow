"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { MobileDashboardOverview } from "@/features/dashboard/components/mobile-dashboard-overview";
import { DashboardV2Shell } from "@/features/dashboard/components/dashboard-v2-shell";
import type { TaskFormValues } from "@/features/tasks/schemas/task-schema";
import type { Task } from "@/features/tasks/types/task.types";
import { buildDashboardStats } from "@/features/tasks/utils/task-analytics";
import { getTaskDueMeta } from "@/features/tasks/utils/task-deadline";
import { WorkspaceAuthCheckingNotice, WorkspaceStateNotice } from "@/features/auth/components/workspace-state-notice";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { getWorkspaceState } from "@/features/auth/utils/workspace-state";
import { useTaskStore } from "@/features/tasks/store/task-store";

type DashboardRange = "today" | "week" | "all";

const rangeOptions: Array<{ value: DashboardRange; label: string }> = [
  { value: "today", label: "今天" },
  { value: "week", label: "本周" },
  { value: "all", label: "全部" },
];

type DashboardClientProps = {
  initialRange?: DashboardRange;
};

export function DashboardClient({ initialRange = "today" }: DashboardClientProps) {
  const { user, isConfigured, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [range, setRange] = useState<DashboardRange>(initialRange);
  const tasks = useTaskStore((state) => state.tasks);
  const isLoading = useTaskStore((state) => state.isLoading);
  const error = useTaskStore((state) => state.error);
  const lastLoadedUserId = useTaskStore((state) => state.lastLoadedUserId);
  const syncTasks = useTaskStore((state) => state.syncTasks);
  const createTaskAsync = useTaskStore((state) => state.createTaskAsync);

  useEffect(() => {
    if (isConfigured && user?.id && lastLoadedUserId !== user.id) {
      void syncTasks(user.id);
    }
  }, [isConfigured, lastLoadedUserId, syncTasks, user?.id]);

  useEffect(() => {
    const nextRange = parseDashboardRange(searchParams.get("range"));
    setRange((current) => (current === nextRange ? current : nextRange));
  }, [searchParams]);

  const scopedTasks = useMemo(() => filterTasksByRange(tasks, range), [range, tasks]);
  const stats = useMemo(() => buildDashboardStats(tasks, { range }), [tasks, range]);
  const workspaceState = getWorkspaceState({
    isAuthLoading,
    isTaskLoading: isLoading,
    taskCount: tasks.length,
    userId: user?.id,
  });
  const isSyncing = workspaceState === "syncing";
  const isAccountEmpty = workspaceState === "account-empty";
  const isRangeEmpty = isAccountEmpty || (workspaceState === "ready" && stats.totalCount === 0);
  const activeScopedTasks = useMemo(
    () => scopedTasks.filter((task) => task.status !== "done"),
    [scopedTasks],
  );
  const rangeLabel = rangeOptions.find((item) => item.value === range)?.label ?? "今天";

  const dueSummary = useMemo(() => {
    return activeScopedTasks.reduce(
      (summary, task) => {
        const dueMeta = getTaskDueMeta(task);

        if (dueMeta.isOverdue) {
          summary.overdue += 1;
        }

        if (dueMeta.isDueToday) {
          summary.today += 1;
        }

        if (dueMeta.isUpcoming) {
          summary.upcoming += 1;
        }

        return summary;
      },
      { overdue: 0, today: 0, upcoming: 0 },
    );
  }, [activeScopedTasks]);

  const completionRate = useMemo(() => {
    const completed = scopedTasks.filter((task) => task.status === "done").length;
    return scopedTasks.length ? Math.round((completed / scopedTasks.length) * 100) : 0;
  }, [scopedTasks]);

  const handleRangeChange = (nextRange: DashboardRange) => {
    setRange(nextRange);

    const params = new URLSearchParams(searchParams.toString());
    params.set("range", nextRange);

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const handleCreateTask = async (values: TaskFormValues) => {
    await createTaskAsync(values, user?.id);
  };

  if (workspaceState === "auth-checking") return <WorkspaceAuthCheckingNotice />;
  if (workspaceState === "guest") {
    return (
      <WorkspaceStateNotice
        title="登录后开始管理任务"
        description="登录后即可创建任务、查看今日重点，并在这里同步你的真实进度。"
      />
    );
  }

  return (
    <>
      {error ? (
        <section className="card-surface" style={{ borderRadius: 24, padding: 20 }}>
          <p style={{ margin: 0, color: "var(--danger)", lineHeight: 1.7 }}>{error}</p>
        </section>
      ) : null}
      <div className="dashboard-desktop-only">
        <DashboardV2Shell
          stats={stats}
          range={range}
          rangeLabel={rangeLabel}
          isLoading={isLoading}
          isEmpty={isRangeEmpty}
          isAccountEmpty={isAccountEmpty}
          rangeOptions={rangeOptions}
          onRangeChange={handleRangeChange}
          onCreateTask={handleCreateTask}
        />
      </div>
      <div className="dashboard-mobile-only">
        <MobileDashboardOverview
          tasks={scopedTasks}
          activeTasks={activeScopedTasks}
          range={range}
          rangeLabel={rangeLabel}
          completionRate={completionRate}
          dueSummary={dueSummary}
          isLoading={isLoading}
          onRangeChange={handleRangeChange}
        />
      </div>
    </>
  );
}

function filterTasksByRange(tasks: Task[], range: DashboardRange) {
  if (range === "all") {
    return tasks;
  }

  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);

  if (range === "today") {
    end.setDate(start.getDate() + 1);
  } else {
    end.setDate(start.getDate() + 7);
  }

  return tasks.filter((task) => {
    const checkpoints = [task.createdAt, task.updatedAt, task.completedAt, task.dueDate].filter(
      Boolean,
    ) as string[];

    return checkpoints.some((value) => {
      const timestamp = new Date(value).getTime();
      return !Number.isNaN(timestamp) && timestamp >= start.getTime() && timestamp < end.getTime();
    });
  });
}

function parseDashboardRange(value: string | null | undefined): DashboardRange {
  if (value === "week" || value === "all") {
    return value;
  }

  return "today";
}
