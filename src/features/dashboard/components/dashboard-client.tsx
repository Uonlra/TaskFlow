"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { MobileDashboardOverview } from "@/features/dashboard/components/mobile-dashboard-overview";
import { DashboardV2Shell } from "@/features/dashboard/components/dashboard-v2-shell";
import type { DashboardPriorityFilters } from "@/features/dashboard/types/dashboard-query";
import { useDashboardSummary } from "@/features/dashboard/hooks/use-dashboard-summary";
import type { TaskFormValues } from "@/features/tasks/schemas/task-schema";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { useTaskStore } from "@/features/tasks/store/task-store";
import { TaskQuickViewDialog } from "@/features/tasks/components/task-quick-view-dialog";
import type { DashboardTaskPreview } from "@/features/tasks/utils/task-analytics";
import type { Task } from "@/features/tasks/types/task.types";
import { getTaskDueMeta } from "@/features/tasks/utils/task-deadline";
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

export function DashboardClient({ initialRange = "today" }: DashboardClientProps) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const range = parseDashboardRange(searchParams.get("range") ?? initialRange);
  const [priorityFilters, setPriorityFilters] = useState<DashboardPriorityFilters>(initialPriorityFilters);
  const createTaskAsync = useTaskStore((state) => state.createTaskAsync);
  const updateTask = useTaskStore((state) => state.updateTask);
  const updateTaskStatus = useTaskStore((state) => state.updateTaskStatus);
  const deleteTask = useTaskStore((state) => state.deleteTask);
  const storeTasks = useTaskStore((state) => state.tasks);
  const lastLoadedUserId = useTaskStore((state) => state.lastLoadedUserId);
  const syncedTasks = !isAuthLoading && (!user || lastLoadedUserId === user.id) ? storeTasks : [];
  const [preview, setPreview] = useState<{ userId?: string; task: Task } | null>(null);
  const previewTask = preview?.userId === user?.id && !isAuthLoading ? (preview?.task ?? null) : null;
  const setPreviewTask = (task: Task | null) => setPreview(task ? { userId: user?.id, task } : null);
  const {
    stats,
    hasAnyTasks,
    hasPreviousData,
    isLoading: isSummaryLoading,
    error,
    reload: loadSummary,
  } = useDashboardSummary({ range, ...priorityFilters });
  const isAccountEmpty = !isAuthLoading && !isSummaryLoading && !hasAnyTasks && !error;
  const isRangeEmpty = !isSummaryLoading && !error && hasAnyTasks && stats.totalCount === 0;
  const rangeLabel = rangeOptions.find((item) => item.value === range)?.label ?? "今天";
  const orbitTasks = syncedTasks.some((task) => task.status !== "done")
    ? syncedTasks.filter((task) => task.status !== "done").map(toDashboardTaskPreview)
    : stats.focusTasks;

  const handleRangeChange = (nextRange: DashboardRange) => {
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

  const handlePreviewUpdate = async (task: Task, values: TaskFormValues) => {
    await updateTask(task.id, values, user?.id);
    await loadSummary();

    const updatedTask = useTaskStore.getState().tasks.find((item) => item.id === task.id);
    setPreviewTask(updatedTask ?? null);
  };

  const handlePreviewDelete = async (task: Task) => {
    await deleteTask(task.id, user?.id);
    await loadSummary();
    setPreviewTask(null);
  };

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
          orbitTasks={orbitTasks}
          range={range}
          rangeLabel={rangeLabel}
          isLoading={isSummaryLoading}
          isEmpty={isRangeEmpty}
          error={error}
          onRetry={() => void loadSummary()}
          hasPreviousData={hasPreviousData}
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
          isLoading={isSummaryLoading}
          onRangeChange={handleRangeChange}
          onCreateTask={handleCreateTask}
          onPreviewTask={handlePreviewTask}
        />
      </div>
      <TaskQuickViewDialog
        task={previewTask}
        onClose={() => setPreviewTask(null)}
        onUpdateTask={handlePreviewUpdate}
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
    createdAt: task.createdAt,
  };
}

function toDashboardTaskPreview(task: Task): DashboardTaskPreview {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    createdAt: task.createdAt,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate,
    dueLabel: getTaskDueMeta(task).label,
    tags: task.tags,
  };
}
