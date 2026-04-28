"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { TaskFormValues } from "@/features/tasks/schemas/task-schema";
import type { Task } from "@/features/tasks/types/task.types";
import { parseTagsInput } from "@/features/tasks/utils/task-tags";
import { hasAppwritePublicEnv } from "@/lib/appwrite/env";
import { tasks as initialTasks } from "@/mock/tasks";

type TaskStore = {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  lastLoadedUserId: string | null;
  clearTasks: () => void;
  syncTasks: (userId?: string) => Promise<void>;
  createTask: (input: TaskFormValues) => string;
  createTaskAsync: (input: TaskFormValues, userId?: string) => Promise<string>;
  updateTask: (id: string, input: TaskFormValues, userId?: string) => Promise<void>;
  updateTaskStatus: (id: string, status: Task["status"], userId?: string) => Promise<void>;
  deleteTask: (id: string, userId?: string) => Promise<void>;
};

const fallbackStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

export const useTaskStore = create<TaskStore>()(
  persist(
    (set, get): TaskStore => ({
      tasks: initialTasks,
      isLoading: false,
      error: null,
      lastLoadedUserId: null,
      clearTasks: () => {
        set({
          tasks: hasAppwritePublicEnv ? [] : initialTasks,
          error: null,
          lastLoadedUserId: null,
        });
      },
      syncTasks: async (userId?: string): Promise<void> => {
        if (!hasAppwritePublicEnv) {
          return;
        }

        if (!userId) {
          set({ tasks: [], lastLoadedUserId: null });
          return;
        }

        set({ isLoading: true, error: null, tasks: [] });

        try {
          const payload = await apiRequest<{ tasks: Task[] }>("/api/tasks");

          set({
            tasks: (payload.tasks ?? []).map(normalizeTask),
            isLoading: false,
            error: null,
            lastLoadedUserId: userId,
          });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : "无法同步任务列表。",
          });
        }
      },
      createTask: (input: TaskFormValues): string => {
        const id = `task-${Date.now()}`;

        set((state) => ({
          tasks: [
            {
              id,
              title: input.title,
              description: input.description,
              status: input.status,
              priority: input.priority,
              tags: parseTagsInput(input.tags),
              dueDate: input.dueDate || undefined,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              completedAt: input.status === "done" ? new Date().toISOString() : undefined,
            },
            ...state.tasks,
          ],
        }));

        return id;
      },
      createTaskAsync: async (input: TaskFormValues, userId?: string): Promise<string> => {
        if (!hasAppwritePublicEnv) {
          return get().createTask(input);
        }

        if (!userId) {
          throw new Error("请先登录后再创建任务。");
        }

        set({ error: null });

        const payload = await apiRequest<{ task: Task }>("/api/tasks", {
          method: "POST",
          body: input,
        });

        const createdTask = normalizeTask(payload.task);

        set((state) => ({
          tasks: [createdTask, ...state.tasks],
        }));

        return createdTask.id;
      },
      updateTask: async (id: string, input: TaskFormValues, userId?: string): Promise<void> => {
        if (!hasAppwritePublicEnv) {
          set((state) => ({
            tasks: state.tasks.map((task) =>
              task.id === id
                ? {
                    ...task,
                    title: input.title,
                    description: input.description,
                    status: input.status,
                    priority: input.priority,
                    tags: parseTagsInput(input.tags),
                    dueDate: input.dueDate || undefined,
                    updatedAt: new Date().toISOString(),
                    completedAt:
                      input.status === "done"
                        ? task.completedAt ?? new Date().toISOString()
                        : undefined,
                  }
                : task,
            ),
          }));
          return;
        }

        if (!userId) {
          throw new Error("请先登录后再编辑任务。");
        }

        set({ error: null });

        const payload = await apiRequest<{ task: Task }>(`/api/tasks/${id}`, {
          method: "PATCH",
          body: input,
        });

        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id ? normalizeTask(payload.task) : task,
          ),
        }));
      },
      updateTaskStatus: async (id: string, status: Task["status"], userId?: string): Promise<void> => {
        if (!hasAppwritePublicEnv) {
          set((state) => ({
            tasks: state.tasks.map((task) =>
              task.id === id
                ? {
                    ...task,
                    status,
                    updatedAt: new Date().toISOString(),
                    completedAt: status === "done" ? new Date().toISOString() : undefined,
                  }
                : task,
            ),
          }));
          return;
        }

        if (!userId) {
          throw new Error("请先登录后再更新任务状态。");
        }

        set({ error: null });

        const payload = await apiRequest<{ task: Task }>(`/api/tasks/${id}`, {
          method: "PATCH",
          body: {
            status,
          },
        });

        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id ? normalizeTask(payload.task) : task,
          ),
        }));
      },
      deleteTask: async (id: string, userId?: string): Promise<void> => {
        if (!hasAppwritePublicEnv) {
          set((state) => ({
            tasks: state.tasks.filter((task) => task.id !== id),
          }));
          return;
        }

        if (!userId) {
          throw new Error("请先登录后再删除任务。");
        }

        set({ error: null });

        await apiRequest(`/api/tasks/${id}`, {
          method: "DELETE",
        });

        set((state) => ({
          tasks: state.tasks.filter((task) => task.id !== id),
        }));
      },
    }),
    {
      name: "taskflow-task-store",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? window.localStorage : fallbackStorage,
      ),
      merge: (persistedState, currentState) => {
        const nextState = persistedState as Partial<TaskStore>;

        return {
          ...currentState,
          ...nextState,
          tasks: (nextState.tasks ?? currentState.tasks).map(normalizeTask),
        };
      },
      partialize: (state) => ({
        tasks: state.tasks,
      }),
    },
  ),
);

function normalizeTask(task: Task): Task {
  return {
    ...task,
    tags: task.tags ?? [],
  };
}

async function apiRequest<T = unknown>(
  input: RequestInfo | URL,
  init?: { method?: "GET" | "POST" | "PATCH" | "DELETE"; body?: unknown },
) {
  const response = await fetch(input, {
    method: init?.method ?? "GET",
    headers:
      init?.body === undefined
        ? undefined
        : {
            "Content-Type": "application/json",
          },
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { message?: string }
      | null;

    throw new Error(payload?.message || "请求失败，请稍后再试。");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
