"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { MobileDashboardOverview } from "@/features/dashboard/components/mobile-dashboard-overview";
import { DashboardV2Shell } from "@/features/dashboard/components/dashboard-v2-shell";
import type { DashboardPriorityFilters } from "@/features/dashboard/components/dashboard-range-menu";
import type { TaskFormValues } from "@/features/tasks/schemas/task-schema";
import { buildDashboardStats, type DashboardStats } from "@/features/tasks/utils/task-analytics";
import { WorkspaceAuthCheckingNotice } from "@/features/auth/components/workspace-state-notice";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { getWorkspaceState } from "@/features/auth/utils/workspace-state";
import { useTaskStore } from "@/features/tasks/store/task-store";
import { TaskQuickViewDialog } from "@/features/tasks/components/task-quick-view-dialog";
import type { DashboardTaskPreview } from "@/features/tasks/utils/task-analytics";
import type { Task } from "@/features/tasks/types/task.types";
import { ROUTES } from "@/shared/lib/constants/routes";
import { buildTasksHref } from "@/shared/lib/constants/query-params";

type DashboardRange = "today" | "week" | "all";

const rangeOptions: Array<{ value: DashboardRange; label: string }> = [
  { value: "today", label: "今天" },
  { value: "week", label: "本周" },
  { value: "all", label: "全部" },
];

const initialPriorityFilters: DashboardPriorityFilters = {
  status: "all",
  priority: "all",
  due: "",
};

type DashboardClientProps = {
  initialRange?: DashboardRange;
};

type DashboardSummaryResponse = {
  stats: DashboardStats;
  hasAnyTasks: boolean;
};

export function DashboardClient({ initialRange = "today" }: DashboardClientProps) {
  const { user, isConfigured, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [range, setRange] = useState<DashboardRange>(initialRange);
  const [priorityFilters, setPriorityFilters] = useState<DashboardPriorityFilters>(initialPriorityFilters);
  const createTaskAsync = useTaskStore((state) => state.createTaskAsync);
  const updateTaskStatus = useTaskStore((state) => state.updateTaskStatus);
  const deleteTask = useTaskStore((state) => state.deleteTask);
  const syncedTasks = useTaskStore((state) => state.tasks);
  const [previewTask, setPreviewTask] = useState<Task | null>(null);
  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const nextRange = parseDashboardRange(searchParams.get("range"));
    setRange((current) => (current === nextRange ? current : nextRange));
  }, [searchParams]);

  const loadSummary = useCallback(async () => {
    if (!isConfigured || !user?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ range });
      if (priorityFilters.status !== "all") params.set("status", priorityFilters.status);
      if (priorityFilters.priority !== "all") params.set("priority", priorityFilters.priority);
      if (priorityFilters.due) params.set("due", priorityFilters.due);

      const response = await fetch(`/api/dashboard/summary?${params.toString()}`);
      const payload = (await response.json().catch(() => null)) as
        DashboardSummaryResponse | { message?: string } | null;

      if (!response.ok || !payload || !("stats" in payload)) {
        throw new Error((payload && "message" in payload ? payload.message : undefined) || "无法加载总览数据。");
      }

      setSummary(payload);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "无法加载总览数据。");
    } finally {
      setIsLoading(false);
    }
  }, [isConfigured, priorityFilters, range, user?.id]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const isGuest = !isAuthLoading && !user;
  const stats = isGuest ? buildDashboardStats(syncedTasks, { range }) : (summary?.stats ?? buildDashboardStats([], { range }));
  const hasAnyTasks = isGuest ? syncedTasks.length > 0 : (summary?.hasAnyTasks ?? false);
  const workspaceState = getWorkspaceState({
    isAuthLoading,
    isTaskLoading: isLoading,
    taskCount: hasAnyTasks ? 1 : 0,
    userId: user?.id,
  });
  const isAccountEmpty = !hasAnyTasks && !error;
  const isRangeEmpty = !isLoading && !error && hasAnyTasks && stats.totalCount === 0;
  const rangeLabel = rangeOptions.find((item) => item.value === range)?.label ?? "今天";

  const handleRangeChange = (nextRange: DashboardRange) => {
    setRange(nextRange);

    const params = new URLSearchParams(searchParams.toString());
    params.set("range", nextRange);

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const handleStatusFilter = (filter: "active" | "in_progress" | "near") => {
    const href = filter === "near" ? buildTasksHref({ due: "near" }) : buildTasksHref({ status: filter });
    router.push(href);
  };

  const handleCreateTask = async (values: TaskFormValues) => {
    await createTaskAsync(values, user?.id);
    await loadSummary();
  };

  const handlePreviewTask = (task: DashboardTaskPreview) => {
    const syncedTask = syncedTasks.find((item) => item.id === task.id);
    setPreviewTask(
      syncedTask ? { ...syncedTask, description: syncedTask.description || task.description } : toTaskPreview(task),
    );
  };

  const handlePreviewStatus = async (task: Task) => {
    await updateTaskStatus(task.id, task.status === "done" ? "todo" : "done", user?.id);
    await loadSummary();
    setPreviewTask(null);
  };

  const handlePreviewDelete = async (task: Task) => {
    await deleteTask(task.id, user?.id);
    await loadSummary();
    setPreviewTask(null);
  };

  if (workspaceState === "auth-checking") {
    return <WorkspaceAuthCheckingNotice />;
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
          priorityTasks={stats.focusTasks}
          range={range}
          rangeLabel={rangeLabel}
          isLoading={isGuest ? false : isLoading}
          isEmpty={isRangeEmpty}
          error={error}
          onRetry={() => void loadSummary()}
          hasPreviousData={Boolean(summary)}
          isAccountEmpty={isAccountEmpty}
          rangeOptions={rangeOptions}
          onRangeChange={handleRangeChange}
          priorityFilters={priorityFilters}
          onPriorityFiltersChange={setPriorityFilters}
          onCreateTask={handleCreateTask}
          onPreviewTask={handlePreviewTask}
          onStatusFilter={handleStatusFilter}
        />
      </div>
      <div className="dashboard-mobile-only">
        <MobileDashboardOverview
          stats={stats}
          range={range}
          rangeLabel={rangeLabel}
          isLoading={isGuest ? false : isLoading}
          onRangeChange={handleRangeChange}
          onCreateTask={handleCreateTask}
          onPreviewTask={handlePreviewTask}
        />
      </div>
      <TaskQuickViewDialog
        task={previewTask}
        onClose={() => setPreviewTask(null)}
        onEdit={(task) => {
          setPreviewTask(null);
          router.push(`${ROUTES.tasks}/${task.id}`);
        }}
        onToggleComplete={handlePreviewStatus}
        onDelete={handlePreviewDelete}
      />
    </>
  );
}

function parseDashboardRange(value: string | null | undefined): DashboardRange {
  if (value === "week" || value === "all") {
    return value;
  }

  return "today";
}

function toTaskPreview(task: DashboardTaskPreview): Task {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    tags: task.tags,
    dueDate: task.dueDate,
    createdAt: "",
  };
}
