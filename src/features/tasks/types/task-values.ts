import { z } from "zod";

export const TASK_STATUSES = ["todo", "in_progress", "done"] as const;

export const TASK_PRIORITIES = ["low", "medium", "high"] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const taskStatusSchema = z.enum(TASK_STATUSES);

export const taskPrioritySchema = z.enum(TASK_PRIORITIES);
