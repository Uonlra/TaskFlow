"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { TaskFormValues } from "@/features/tasks/schemas/task-schema";
import type { Task } from "@/features/tasks/types/task.types";
import { parseTagsInput } from "@/features/tasks/utils/task-tags";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { tasks as initialTasks } from "@/mock/tasks";

type TaskRow = {
  id: string;
  title: string;
  description: string;
  status: Task["status"];
  priority: Task["priority"];
  tags: string[] | null;
  due_date: string | null;
  created_at: string;
  updated_at: string | null;
  completed_at: string | null;
};

type TaskStore = {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  lastLoadedUserId: string | null;
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
      syncTasks: async (userId?: string): Promise<void> => {
        if (!hasSupabaseEnv || !userId) {
          return;
        }

        const client = getSupabaseBrowserClient();

        if (!client) {
          return;
        }

        set({ isLoading: true, error: null, tasks: [] });

        const { data, error } = await client
          .from("tasks")
          .select("id, title, description, status, priority, tags, due_date, created_at, updated_at, completed_at")
          .order("created_at", { ascending: false });

        if (error) {
          set({ isLoading: false, error: error.message });
          return;
        }

        set({
          tasks: (data ?? []).map(mapTaskRow),
          isLoading: false,
          error: null,
          lastLoadedUserId: userId,
        });
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
        if (!hasSupabaseEnv || !userId) {
          return get().createTask(input);
        }

        const client = getSupabaseBrowserClient();

        if (!client) {
          return get().createTask(input);
        }

        set({ error: null });

        const { data, error } = await client
          .from("tasks")
          .insert({
            user_id: userId,
            title: input.title,
            description: input.description,
            status: input.status,
            priority: input.priority,
            tags: parseTagsInput(input.tags),
            due_date: input.dueDate || null,
            completed_at: input.status === "done" ? new Date().toISOString() : null,
          })
          .select("id, title, description, status, priority, tags, due_date, created_at, updated_at, completed_at")
          .single();

        if (error) {
          set({ error: error.message });
          throw error;
        }

        const createdTask = mapTaskRow(data);

        set((state) => ({
          tasks: [createdTask, ...state.tasks],
        }));

        return createdTask.id;
      },
      updateTask: async (id: string, input: TaskFormValues, userId?: string): Promise<void> => {
        if (!hasSupabaseEnv || !userId) {
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
                    completedAt: input.status === "done" ? task.completedAt ?? new Date().toISOString() : undefined,
                  }
                : task,
            ),
          }));
          return;
        }

        const client = getSupabaseBrowserClient();

        if (!client) {
          return;
        }

        set({ error: null });

        const { data, error } = await client
          .from("tasks")
          .update({
            title: input.title,
            description: input.description,
            status: input.status,
            priority: input.priority,
            tags: parseTagsInput(input.tags),
            due_date: input.dueDate || null,
            completed_at: input.status === "done" ? new Date().toISOString() : null,
          })
          .eq("id", id)
          .select("id, title, description, status, priority, tags, due_date, created_at, updated_at, completed_at")
          .single();

        if (error) {
          set({ error: error.message });
          throw error;
        }

        set((state) => ({
          tasks: state.tasks.map((task) => (task.id === id ? mapTaskRow(data) : task)),
        }));
      },
      updateTaskStatus: async (id: string, status: Task["status"], userId?: string): Promise<void> => {
        if (!hasSupabaseEnv || !userId) {
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

        const client = getSupabaseBrowserClient();

        if (!client) {
          return;
        }

        set({ error: null });

        const { data, error } = await client
          .from("tasks")
          .update({
            status,
            completed_at: status === "done" ? new Date().toISOString() : null,
          })
          .eq("id", id)
          .select("id, title, description, status, priority, tags, due_date, created_at, updated_at, completed_at")
          .single();

        if (error) {
          set({ error: error.message });
          throw error;
        }

        set((state) => ({
          tasks: state.tasks.map((task) => (task.id === id ? mapTaskRow(data) : task)),
        }));
      },
      deleteTask: async (id: string, userId?: string): Promise<void> => {
        if (!hasSupabaseEnv || !userId) {
          set((state) => ({
            tasks: state.tasks.filter((task) => task.id !== id),
          }));
          return;
        }

        const client = getSupabaseBrowserClient();

        if (!client) {
          return;
        }

        set({ error: null });

        const { error } = await client.from("tasks").delete().eq("id", id);

        if (error) {
          set({ error: error.message });
          throw error;
        }

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

function mapTaskRow(row: TaskRow): Task {
  return normalizeTask({
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    tags: row.tags ?? [],
    dueDate: row.due_date ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
  });
}

function normalizeTask(task: Task): Task {
  return {
    ...task,
    tags: task.tags ?? [],
  };
}
