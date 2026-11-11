"use client";

import { create } from "zustand";
import type { TaskEvolutionCommand } from "@/features/tasks/schemas/task-evolution-schema";
import {
  assertOrdinaryTaskEdit,
  executeTaskEvolution,
  restoreTaskEvolution,
  projectTaskEvolution,
  assertTaskEvolutionProjection,
} from "@/features/tasks/domain/task-evolution-storage";

import { remoteTaskRepository } from "@/features/tasks/repositories/remote-task-repository";
import { DesktopTaskRepository } from "@/features/tasks/repositories/desktop-task-repository";
import { getTaskRepository } from "@/features/tasks/repositories/task-repository-selector";
import type { TaskFormValues } from "@/features/tasks/schemas/task-schema";
import type { Task } from "@/features/tasks/types/task.types";
import { flushDesktopSyncQueue, pullDesktopSyncRecords } from "@/features/tasks/sync/desktop-sync";
import { parseTagsInput } from "@/features/tasks/utils/task-tags";
import { hasAppwritePublicEnv } from "@/shared/lib/appwrite/env";
import { getDesktopBridge, isDesktopRuntime } from "@/shared/lib/desktop/bridge";

let taskLoadVersion = 0;

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
  executeEvolution: (id: string, command: TaskEvolutionCommand, userId?: string) => Promise<Task>;
};

export const useTaskStore = create<TaskStore>()((set) => ({
  tasks: [],
  isLoading: false,
  error: null,
  lastLoadedUserId: null,
  clearTasks: () => set({ tasks: [], error: null, lastLoadedUserId: null }),
  hydrateGuestTasks: () => {
    if (isDesktopRuntime()) {
      void useTaskStore.getState().syncTasks();
      return;
    }
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
    const version = ++taskLoadVersion;
    if (!isDesktopRuntime() && (!hasAppwritePublicEnv || !userId)) {
      const guestTasks = readGuestTasks();
      set({ tasks: guestTasks, error: null, lastLoadedUserId: null, isLoading: false });
      return;
    }

    set((state) => ({
      isLoading: state.lastLoadedUserId !== userId,
      error: null,
      tasks: state.lastLoadedUserId === userId ? state.tasks : [],
    }));
    const repository = getTaskRepository(userId);

    if (isDesktopRuntime()) {
      try {
        const workspace = await getDesktopBridge()!.workspace.get();
        if (userId && hasAppwritePublicEnv && workspace.syncEnabled && workspace.accountId === userId) {
          await flushDesktopSyncQueue(userId);
          const remoteTasks = await pullDesktopSyncRecords();
          if (version !== taskLoadVersion) return;
          if (repository instanceof DesktopTaskRepository) await repository.importRemoteTasks(remoteTasks, userId);
        }
      } catch {
        // Local tasks remain available when cloud synchronization fails.
      }

      try {
        const tasks = await repository.list();
        if (version === taskLoadVersion)
          set({ tasks: tasks.map(normalizeTask), isLoading: false, error: null, lastLoadedUserId: userId ?? null });
      } catch (error) {
        set({ isLoading: false, error: error instanceof Error ? error.message : "无法加载本地任务列表。" });
      }
      return;
    }

    try {
      await mergeGuestTasks();
      const tasks = await repository.list();
      set({ tasks: tasks.map(normalizeTask), isLoading: false, error: null, lastLoadedUserId: userId ?? null });
    } catch (error) {
      set({ isLoading: false, error: error instanceof Error ? error.message : "无法同步任务列表。" });
    }
  },
  createTaskAsync: async (input, userId) => {
    if (!userId && !isDesktopRuntime()) {
      const task = createGuestTask(input);
      set((state) => {
        const tasks = [task, ...state.tasks];
        writeGuestTasks(tasks);
        return { tasks, error: null };
      });
      return task.id;
    }

    const createdTask = normalizeTask(await getTaskRepository(userId).create(input));
    set((state) => ({ tasks: [createdTask, ...state.tasks], error: null }));
    return createdTask.id;
  },
  executeEvolution: async (id, command, userId) => {
    if (!userId && !isDesktopRuntime()) {
      let updated: Task | undefined;
      set((state) => {
        const current = state.tasks.find((task) => task.id === id);
        if (!current) throw new Error("任务不存在。");
        updated = executeTaskEvolution(current, command, new Date().toISOString());
        if (updated === current) return state;
        const tasks = state.tasks.map((task) => (task.id === id ? updated! : task));
        writeGuestTasks(tasks);
        return { tasks, error: null };
      });
      return updated!;
    }
    const updated = normalizeTask(await getTaskRepository(userId).executeEvolution(id, command));
    set((state) => ({ tasks: replaceKnownTask(state.tasks, updated), error: null }));
    return updated;
  },
  updateTask: async (id, input, userId) => {
    if (!userId && !isDesktopRuntime()) {
      set((state) => {
        const tasks = state.tasks.map((task) => (task.id === id ? updateGuestTask(task, input) : task));
        writeGuestTasks(tasks);
        return { tasks, error: null };
      });
      return;
    }

    const updatedTask = normalizeTask(await getTaskRepository(userId).update(id, input));
    set((state) => ({
      tasks: replaceKnownTask(state.tasks, updatedTask),
      error: null,
    }));
  },
  updateTaskStatus: async (id, status, userId) => {
    if (!userId && !isDesktopRuntime()) {
      set((state) => {
        const tasks = state.tasks.map((task) => (task.id === id ? updateGuestTaskStatus(task, status) : task));
        writeGuestTasks(tasks);
        return { tasks, error: null };
      });
      return;
    }

    const updatedTask = normalizeTask(await getTaskRepository(userId).updateStatus(id, status));
    set((state) => ({
      tasks: replaceKnownTask(state.tasks, updatedTask),
      error: null,
    }));
  },
  deleteTask: async (id, userId) => {
    if (!userId && !isDesktopRuntime()) {
      set((state) => {
        const tasks = state.tasks.filter((task) => task.id !== id);
        writeGuestTasks(tasks);
        return { tasks, error: null };
      });
      return;
    }

    await getTaskRepository(userId).delete(id);
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
  assertTaskEvolutionProjection(input);
  const now = new Date().toISOString();
  const task: Task = {
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
  return input.evolution ? projectTaskEvolution(task, restoreTaskEvolution(input.evolution, task.id), now) : task;
}

function updateGuestTask(task: Task, input: TaskFormValues): Task {
  assertOrdinaryTaskEdit(task, input);
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
  assertOrdinaryTaskEdit(task, { title: task.title, status });
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
    ...(task.evolution ? { evolution: task.evolution } : {}),
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
    throw new Error("本地保存失败，任务尚未保存。请检查浏览器存储空间后重试。");
  }
}

function normalizeTask(task: Task): Task {
  return { ...task, tags: task.tags ?? [] };
}

function replaceKnownTask(tasks: Task[], updated: Task): Task[] {
  return tasks.some((task) => task.id === updated.id)
    ? tasks.map((task) => (task.id === updated.id ? updated : task))
    : [updated, ...tasks];
}
