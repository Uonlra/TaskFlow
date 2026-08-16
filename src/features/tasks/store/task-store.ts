"use client";

import { create } from "zustand";

import type { TaskFormValues } from "@/features/tasks/schemas/task-schema";
import type { Task } from "@/features/tasks/types/task.types";
import { hasAppwritePublicEnv } from "@/shared/lib/appwrite/env";

type TaskStore = {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  lastLoadedUserId: string | null;
  clearTasks: () => void;
  initializeTasks: (tasks: Task[], userId: string) => void;
  syncTasks: (userId?: string) => Promise<void>;
  createTaskAsync: (input: TaskFormValues, userId?: string) => Promise<string>;
  updateTask: (id: string, input: TaskFormValues, userId?: string) => Promise<void>;
  updateTaskStatus: (id: string, status: Task["status"], userId?: string) => Promise<void>;
  deleteTask: (id: string, userId?: string) => Promise<void>;
};

export const useTaskStore = create<TaskStore>()((set) => ({
  tasks: [],
  isLoading: false,
  error: null,
  lastLoadedUserId: null,
  clearTasks: () => set({ tasks: [], error: null, lastLoadedUserId: null }),
  initializeTasks: (tasks, userId) =>
    set((state) => {
      if (state.lastLoadedUserId === userId) {
        return state;
      }

      return {
        tasks: tasks.map(normalizeTask),
        isLoading: false,
        error: null,
        lastLoadedUserId: userId,
      };
    }),
  syncTasks: async (userId?: string): Promise<void> => {
    if (!hasAppwritePublicEnv || !userId) {
      set({ tasks: [], error: null, lastLoadedUserId: null, isLoading: false });
      return;
    }

    set({ isLoading: true, error: null, tasks: [] });
    try {
      const payload = await apiRequest<{ tasks: Task[] }>("/api/tasks");
      set({ tasks: (payload.tasks ?? []).map(normalizeTask), isLoading: false, error: null, lastLoadedUserId: userId });
    } catch (error) {
      set({ isLoading: false, error: error instanceof Error ? error.message : "无法同步任务列表。" });
    }
  },
  createTaskAsync: async (input, userId) => {
    assertSignedIn(userId, "创建");
    const payload = await apiRequest<{ task: Task }>("/api/tasks", { method: "POST", body: input });
    const createdTask = normalizeTask(payload.task);
    set((state) => ({ tasks: [createdTask, ...state.tasks], error: null }));
    return createdTask.id;
  },
  updateTask: async (id, input, userId) => {
    assertSignedIn(userId, "编辑");
    const payload = await apiRequest<{ task: Task }>(`/api/tasks/${id}`, { method: "PATCH", body: input });
    set((state) => ({
      tasks: state.tasks.map((task) => (task.id === id ? normalizeTask(payload.task) : task)),
      error: null,
    }));
  },
  updateTaskStatus: async (id, status, userId) => {
    assertSignedIn(userId, "更新");
    const payload = await apiRequest<{ task: Task }>(`/api/tasks/${id}`, { method: "PATCH", body: { status } });
    set((state) => ({
      tasks: state.tasks.map((task) => (task.id === id ? normalizeTask(payload.task) : task)),
      error: null,
    }));
  },
  deleteTask: async (id, userId) => {
    assertSignedIn(userId, "删除");
    await apiRequest(`/api/tasks/${id}`, { method: "DELETE" });
    set((state) => ({ tasks: state.tasks.filter((task) => task.id !== id), error: null }));
  },
}));

function assertSignedIn(userId: string | undefined, action: string) {
  if (!hasAppwritePublicEnv || !userId) throw new Error(`请先登录后再${action}任务。`);
}

function normalizeTask(task: Task): Task {
  return { ...task, tags: task.tags ?? [] };
}

async function apiRequest<T = unknown>(
  input: RequestInfo | URL,
  init?: { method?: "GET" | "POST" | "PATCH" | "DELETE"; body?: unknown },
) {
  const response = await fetch(input, {
    method: init?.method ?? "GET",
    headers: init?.body === undefined ? undefined : { "Content-Type": "application/json" },
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(payload?.message || "请求失败，请稍后再试。");
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
