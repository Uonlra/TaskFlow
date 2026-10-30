import type { TaskFormValues } from "@/features/tasks/schemas/task-schema";
import type { Task } from "@/features/tasks/types/task.types";

export type DesktopLocalTasksBridge = {
  list(input: { accountId: string }): Promise<Task[]>;
  get(input: { accountId: string; taskId: string }): Promise<Task | null>;
  upsert(input: { accountId: string; tasks: Task[] }): Promise<Task[]>;
  create(input: { accountId: string; task: TaskFormValues }): Promise<Task>;
  update(input: { accountId: string; taskId: string; task: TaskFormValues }): Promise<Task>;
  updateStatus(input: { accountId: string; taskId: string; status: Task["status"] }): Promise<Task>;
  delete(input: { accountId: string; taskId: string }): Promise<void>;
};

export type DesktopAuthBridge = {
  get(): Promise<unknown>;
  set(envelope: unknown): Promise<void>;
  clear(): Promise<void>;
};

export type TaskflowDesktopBridge = {
  isDesktop: true;
  platform: string;
  version: string;
  localTasks: DesktopLocalTasksBridge;
  auth: DesktopAuthBridge;
};

declare global {
  interface Window {
    taskflowDesktop?: TaskflowDesktopBridge;
  }
}

export function getDesktopBridge() {
  if (typeof window === "undefined") return null;
  return window.taskflowDesktop ?? null;
}

export function isDesktopRuntime() {
  return Boolean(getDesktopBridge()?.isDesktop);
}
