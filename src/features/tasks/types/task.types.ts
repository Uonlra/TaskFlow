export type { TaskPriority, TaskStatus } from "./task-values";

import type { TaskPriority, TaskStatus } from "./task-values";

export type Task = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  tags: string[];
  dueDate?: string;
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
};

export type TaskPageInitialData = {
  userId: string;
  tasks: Task[];
  total: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
  categoryCounts: {
    near: number;
    active: number;
    done: number;
    all: number;
  };
};
