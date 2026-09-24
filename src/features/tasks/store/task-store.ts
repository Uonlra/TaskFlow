"use client";

import { create } from "zustand";

import { remoteTaskRepository } from "@/features/tasks/repositories/remote-task-repository";
import type { TaskFormValues } from "@/features/tasks/schemas/task-schema";
import type { Task } from "@/features/tasks/types/task.types";
import { parseTagsInput } from "@/features/tasks/utils/task-tags";
import { hasAppwritePublicEnv } from "@/shared/lib/appwrite/env";

export const GUEST_TASKS_STORAGE_KEY = "u-task-guest-tasks";

type TaskStore = {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  lastLoadedUserId: string | null;
  clearTasks: () => void;
  hydrateGuestTasks: () => void;
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
  hydrateGuestTasks: () => {
    const tasks = readGuestTasks();
    set({ tasks, error: null, lastLoadedUserId: null, isLoading: false });
  },
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
      const guestTasks = readGuestTasks();
      set({ tasks: guestTasks, error: null, lastLoadedUserId: null, isLoading: false });
      return;
    }

    set({ isLoading: true, error: null, tasks: [] });
    try {
      await mergeGuestTasks();
      const tasks = await remoteTaskRepository.list();
      set({ tasks: tasks.map(normalizeTask), isLoading: false, error: null, lastLoadedUserId: userId });
    } catch (error) {
      set({ isLoading: false, error: error instanceof Error ? error.message : "无法同步任务列表。" });
    }
  },
  createTaskAsync: async (input, userId) => {
    if (!userId) {
      const task = createGuestTask(input);
      set((state) => {
        const tasks = [task, ...state.tasks];
        writeGuestTasks(tasks);
        return { tasks, error: null };
      });
      return task.id;
    }

    const createdTask = normalizeTask(await remoteTaskRepository.create(input));
    set((state) => ({ tasks: [createdTask, ...state.tasks], error: null }));
    return createdTask.id;
  },
  updateTask: async (id, input, userId) => {
    if (!userId) {
      set((state) => {
        const tasks = state.tasks.map((task) => (task.id === id ? updateGuestTask(task, input) : task));
        writeGuestTasks(tasks);
        return { tasks, error: null };
      });
      return;
    }

    const updatedTask = normalizeTask(await remoteTaskRepository.update(id, input));
    set((state) => ({
      tasks: state.tasks.map((task) => (task.id === id ? updatedTask : task)),
      error: null,
    }));
  },
  updateTaskStatus: async (id, status, userId) => {
    if (!userId) {
      set((state) => {
        const tasks = state.tasks.map((task) => (task.id === id ? updateGuestTaskStatus(task, status) : task));
        writeGuestTasks(tasks);
        return { tasks, error: null };
      });
      return;
    }

    const updatedTask = normalizeTask(await remoteTaskRepository.updateStatus(id, status));
    set((state) => ({
      tasks: state.tasks.map((task) => (task.id === id ? updatedTask : task)),
      error: null,
    }));
  },
  deleteTask: async (id, userId) => {
    if (!userId) {
      set((state) => {
        const tasks = state.tasks.filter((task) => task.id !== id);
        writeGuestTasks(tasks);
        return { tasks, error: null };
      });
      return;
    }

    await remoteTaskRepository.delete(id);
    set((state) => ({ tasks: state.tasks.filter((task) => task.id !== id), error: null }));
  },
}));

async function mergeGuestTasks() {
  const guestTasks = readGuestTasks();

  for (const task of guestTasks) {
    await remoteTaskRepository.create(taskToFormValues(task));
    writeGuestTasks(readGuestTasks().filter((candidate) => candidate.id !== task.id));
  }
}

function createGuestTask(input: TaskFormValues): Task {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    title: input.title,
    description: input.description,
    status: input.status,
    priority: input.priority,
    tags: parseTagsInput(input.tags),
    dueDate: input.dueDate || undefined,
    createdAt: now,
    updatedAt: now,
    completedAt: input.status === "done" ? now : undefined,
  };
}

function updateGuestTask(task: Task, input: TaskFormValues): Task {
  const updatedAt = new Date().toISOString();
  return {
    ...task,
    title: input.title,
    description: input.description,
    status: input.status,
    priority: input.priority,
    tags: parseTagsInput(input.tags),
    dueDate: input.dueDate || undefined,
    updatedAt,
    completedAt: input.status === "done" ? (task.completedAt ?? updatedAt) : undefined,
  };
}

function updateGuestTaskStatus(task: Task, status: Task["status"]): Task {
  const updatedAt = new Date().toISOString();
  return {
    ...task,
    status,
    updatedAt,
    completedAt: status === "done" ? (task.completedAt ?? updatedAt) : undefined,
  };
}

function taskToFormValues(task: Task): TaskFormValues {
  return {
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    tags: task.tags.join(", "),
    dueDate: task.dueDate ?? "",
  };
}

function readGuestTasks(): Task[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.sessionStorage.getItem(GUEST_TASKS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeTask) : [];
  } catch {
    return [];
  }
}

function writeGuestTasks(tasks: Task[]) {
  if (typeof window === "undefined") return;

  try {
    if (tasks.length) window.sessionStorage.setItem(GUEST_TASKS_STORAGE_KEY, JSON.stringify(tasks));
    else window.sessionStorage.removeItem(GUEST_TASKS_STORAGE_KEY);
  } catch {
    // Local persistence can be unavailable; the in-memory workspace remains usable.
  }
}

function normalizeTask(task: Task): Task {
  return { ...task, tags: task.tags ?? [] };
}
