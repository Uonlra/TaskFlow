"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@/features/auth/providers/auth-provider";
import { getWorkspaceErrorMessage } from "@/features/auth/utils/workspace-state";
import { getTaskRepository } from "@/features/tasks/repositories/task-repository-selector";
import type { TaskFormValues } from "@/features/tasks/schemas/task-schema";
import { useTaskStore } from "@/features/tasks/store/task-store";
import type { TaskDueRangeQuery, TaskDueRangeResult } from "@/features/tasks/types/task-query";
import type { Task } from "@/features/tasks/types/task.types";
import { getTaskDueMeta } from "@/features/tasks/utils/task-deadline";

const emptyData: TaskDueRangeResult = {
  tasks: [],
  hasAnyTasks: false,
  attention: { overdueCount: 0, nearDueCount: 0 },
};

type RemoteState = {
  key: string;
  data: TaskDueRangeResult;
  isLoading: boolean;
  error: string | null;
};

export function useCalendarTasks({ from, to }: TaskDueRangeQuery) {
  const { user, isConfigured, isLoading: isAuthLoading } = useAuth();
  const userId = user?.id;
  const isGuest = !isAuthLoading && !userId;
  const storeTasks = useTaskStore((state) => state.tasks);
  const createTask = useTaskStore((state) => state.createTaskAsync);
  const updateTask = useTaskStore((state) => state.updateTask);
  const updateTaskStatus = useTaskStore((state) => state.updateTaskStatus);
  const deleteTask = useTaskStore((state) => state.deleteTask);
  const key = !isAuthLoading && isConfigured && userId ? JSON.stringify([userId, from, to]) : null;
  const [remoteState, setRemoteState] = useState<RemoteState | null>(null);
  const activeScope = useRef<string | null>(null);
  const activeRequest = useRef<AbortController | null>(null);

  const load = useCallback(async (): Promise<RemoteState | null> => {
    if (!key) return null;
    // A mutation may finish after the user has switched month or account.
    if (activeScope.current !== key) return null;

    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    try {
      const data = await getTaskRepository(userId).listByDueRange({ from, to }, { signal: controller.signal });
      if (controller.signal.aborted) return null;
      return { key, data, isLoading: false, error: null };
    } catch (error) {
      if (controller.signal.aborted) return null;
      return {
        key,
        data: emptyData,
        isLoading: false,
        error: getWorkspaceErrorMessage(error, "日历任务暂时无法加载，请稍后重试。"),
      };
    }
  }, [from, to, key, userId]);

  const commit = useCallback((next: RemoteState | null) => {
    if (!next || activeScope.current !== next.key) return false;
    setRemoteState(next);
    return !next.error;
  }, []);

  useEffect(() => {
    activeScope.current = key;
    void load().then(commit);
    return () => {
      activeScope.current = null;
      activeRequest.current?.abort();
    };
  }, [key, load, commit]);

  const reload = useCallback(() => {
    if (isGuest) return Promise.resolve(true);
    if (key && activeScope.current === key) {
      setRemoteState((current) => ({
        key,
        data: current?.key === key ? current.data : emptyData,
        isLoading: true,
        error: null,
      }));
    }
    return load().then(commit);
  }, [isGuest, key, load, commit]);

  const guestData = useMemo<TaskDueRangeResult>(() => {
    const attention = { overdueCount: 0, nearDueCount: 0 };
    for (const task of storeTasks) {
      if (task.status === "done") continue;
      const due = getTaskDueMeta(task);
      if (due.isOverdue) attention.overdueCount++;
      if (due.isDueToday || due.isUpcoming) attention.nearDueCount++;
    }
    return { tasks: storeTasks, hasAnyTasks: storeTasks.length > 0, attention };
  }, [storeTasks]);

  const current = remoteState?.key === key ? remoteState : null;
  const data = isGuest ? guestData : (current?.data ?? emptyData);

  return {
    ...data,
    isLoading: isAuthLoading || (!isGuest && (!current || current.isLoading)),
    error: isGuest ? null : (current?.error ?? null),
    reload,
    createTask: async (values: TaskFormValues) => {
      await createTask(values, userId);
      return reload();
    },
    updateTask: async (id: string, values: TaskFormValues) => {
      await updateTask(id, values, userId);
      return reload();
    },
    updateTaskStatus: async (id: string, status: Task["status"]) => {
      await updateTaskStatus(id, status, userId);
      return reload();
    },
    deleteTask: async (id: string) => {
      await deleteTask(id, userId);
      return reload();
    },
  };
}
