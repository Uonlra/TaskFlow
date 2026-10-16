"use client";

import { useCallback, useMemo } from "react";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { getWorkspaceErrorMessage } from "@/features/auth/utils/workspace-state";
import { dashboardRepository } from "@/features/dashboard/repositories/dashboard-repository";
import type { DashboardSummaryQuery } from "@/features/dashboard/types/dashboard-query";
import { useTaskStore } from "@/features/tasks/store/task-store";
import { buildDashboardStats, buildFocusTasks, filterTasksByRange } from "@/features/tasks/utils/task-analytics";
import { matchesTaskDueFilter } from "@/features/tasks/utils/task-deadline";
import { useKeyedQuery } from "@/shared/hooks/use-keyed-query";

export function useDashboardSummary({ range, status, priority, due }: DashboardSummaryQuery) {
  const { user, isConfigured, isLoading: isAuthLoading } = useAuth();
  const tasks = useTaskStore((state) => state.tasks);
  const isGuest = !isAuthLoading && !user;
  const key = user ? JSON.stringify([user.id, range, status, priority, due]) : null;
  const load = useCallback(
    (signal: AbortSignal) => dashboardRepository.getSummary({ range, status, priority, due }, { signal }),
    [range, status, priority, due],
  );
  const remote = useKeyedQuery({
    key,
    enabled: !isAuthLoading && isConfigured && Boolean(user),
    load,
    formatError,
  });
  const guestSummary = useMemo(() => {
    if (!isGuest) return null;
    const stats = buildDashboardStats(tasks, { range });
    const candidates = filterTasksByRange(tasks, range).filter(
      (task) =>
        (status === "all" || task.status === status) &&
        (priority === "all" || task.priority === priority) &&
        (!due || matchesTaskDueFilter(task, due)),
    );
    stats.focusTasks = buildFocusTasks(candidates, { includeCompleted: status === "done" });
    return { stats, hasAnyTasks: tasks.length > 0 };
  }, [isGuest, tasks, range, status, priority, due]);
  const emptyStats = useMemo(() => buildDashboardStats([], { range }), [range]);
  const summary = isGuest ? guestSummary : remote.data;
  return {
    stats: summary?.stats ?? emptyStats,
    hasAnyTasks: summary?.hasAnyTasks ?? false,
    hasPreviousData: Boolean(summary),
    isLoading: !isGuest && (isAuthLoading || remote.isLoading),
    error: isGuest ? null : remote.error,
    reload: isGuest ? async () => true : remote.reload,
  };
}

function formatError(error: unknown) {
  return getWorkspaceErrorMessage(error, "总览数据暂时无法加载，请稍后重试。");
}
