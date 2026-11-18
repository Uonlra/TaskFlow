"use client";

import { useDesktopRuntime } from "@/shared/hooks/use-desktop-runtime";

import { useCallback, useEffect, useMemo } from "react";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { getWorkspaceErrorMessage } from "@/features/auth/utils/workspace-state";
import { getTaskRepository } from "@/features/tasks/repositories/task-repository-selector";
import { useTaskStore } from "@/features/tasks/store/task-store";
import type { TaskFilters } from "@/features/tasks/types/task-filters";
import type { TaskPageInitialData } from "@/features/tasks/types/task.types";
import {
  buildTaskPageParams,
  getTaskPage,
  parseTaskFiltersFromParams,
  type TaskPageResult,
} from "@/features/tasks/utils/task-list-query";
import { useKeyedQuery } from "@/shared/hooks/use-keyed-query";

type TaskPageOptions = {
  filters: TaskFilters;
  page: number;
  initialFilters: TaskFilters;
  initialData: TaskPageInitialData | null;
};

export function useTaskPage({ filters, page, initialFilters, initialData }: TaskPageOptions) {
  const isDesktop = useDesktopRuntime();
  const { user, isConfigured, isLoading: isAuthLoading } = useAuth();
  const localTasks = useTaskStore((state) => state.tasks);
  const localError = useTaskStore((state) => state.error);
  const localLoading = useTaskStore((state) => state.isLoading);
  const localOwner = useTaskStore((state) => state.lastLoadedUserId);
  const isGuest = !isAuthLoading && (!user || isDesktop);
  const userId = user?.id ?? (isAuthLoading ? initialData?.userId : undefined);
  const params = buildTaskPageParams(filters, page).toString();
  const key = userId ? JSON.stringify([userId, params]) : null;
  // Depend on parameter values so unrelated renders do not restart an in-flight request.
  const load = useCallback(
    (signal: AbortSignal) => {
      const query = new URLSearchParams(params);
      return getTaskRepository(userId).listPage(
        // Use the same normalized filter parser as URL navigation.
        parseTaskFiltersFromParams(query),
        Number(query.get("page")),
        { signal },
      );
    },
    [params, userId],
  );
  const remote = useKeyedQuery<TaskPageResult>({
    key,
    enabled: !isDesktop && !isAuthLoading && isConfigured && Boolean(userId),
    load,
    formatError,
    initial: initialData
      ? {
          key: JSON.stringify([initialData.userId, buildTaskPageParams(initialFilters, initialData.page).toString()]),
          data: initialData,
        }
      : null,
  });
  const guestData = useMemo(
    () => (isGuest ? getTaskPage(localTasks, filters, page) : null),
    [isGuest, localTasks, filters, page],
  );
  const reconciled = useMemo(() => {
    if (!remote.data || !userId || localOwner !== userId) return { page: remote.data, refreshKey: null };
    const stored = new Map(localTasks.map((task) => [task.id, task]));
    const newer: [string, number][] = [];
    const tasks = remote.data.tasks.map((task) => {
      const saved = stored.get(task.id);
      if (saved?.evolution && saved.evolution.revision > (task.evolution?.revision ?? -1)) {
        newer.push([task.id, saved.evolution.revision]);
        return saved;
      }
      return task;
    });
    return newer.length
      ? { page: { ...remote.data, tasks }, refreshKey: JSON.stringify([key, newer]) }
      : { page: remote.data, refreshKey: null };
  }, [remote.data, userId, localOwner, localTasks, key]);
  const refreshKey = reconciled.refreshKey;
  const reloadRemote = remote.reload;
  useEffect(() => {
    // A saved evolution can outlive a cached Next.js list page. Refresh membership and counts once per version.
    if (refreshKey) void reloadRemote();
  }, [refreshKey, reloadRemote]);
  return {
    pageData: isGuest ? guestData : reconciled.page,
    isLoading: isGuest ? isDesktop && localLoading : (isAuthLoading && !remote.data) || remote.isLoading,
    error: isGuest ? (isDesktop ? localError : null) : remote.error,
    userId,
    isGuest,
    reload: isGuest ? async () => true : remote.reload,
  };
}

function formatError(error: unknown) {
  return getWorkspaceErrorMessage(error, "任务列表暂时无法加载，请稍后重试。");
}
