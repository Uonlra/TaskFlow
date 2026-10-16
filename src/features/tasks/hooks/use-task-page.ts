"use client";

import { useCallback, useMemo } from "react";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { getWorkspaceErrorMessage } from "@/features/auth/utils/workspace-state";
import { remoteTaskRepository } from "@/features/tasks/repositories/remote-task-repository";
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
  const { user, isConfigured, isLoading: isAuthLoading } = useAuth();
  const localTasks = useTaskStore((state) => state.tasks);
  const isGuest = !isAuthLoading && !user;
  const userId = user?.id ?? (isAuthLoading ? initialData?.userId : undefined);
  const params = buildTaskPageParams(filters, page).toString();
  const key = userId ? JSON.stringify([userId, params]) : null;
  // Depend on parameter values so unrelated renders do not restart an in-flight request.
  const load = useCallback(
    (signal: AbortSignal) => {
      const query = new URLSearchParams(params);
      return remoteTaskRepository.listPage(
        // Use the same normalized filter parser as URL navigation.
        parseTaskFiltersFromParams(query),
        Number(query.get("page")),
        { signal },
      );
    },
    [params],
  );
  const remote = useKeyedQuery<TaskPageResult>({
    key,
    enabled: !isAuthLoading && isConfigured && Boolean(userId),
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
  return {
    pageData: isGuest ? guestData : remote.data,
    isLoading: isGuest ? false : (isAuthLoading && !remote.data) || remote.isLoading,
    error: isGuest ? null : remote.error,
    userId,
    isGuest,
    reload: isGuest ? async () => true : remote.reload,
  };
}

function formatError(error: unknown) {
  return getWorkspaceErrorMessage(error, "任务列表暂时无法加载，请稍后重试。");
}
