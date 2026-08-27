import { z } from "zod";

import { taskPrioritySchema, taskStatusSchema } from "@/features/tasks/types/task-values";

export const appwriteTaskRowSchema = z.object({
  $id: z.string(),
  $createdAt: z.string(),
  $updatedAt: z.string(),
  title: z.string(),
  description: z.string(),
  status: taskStatusSchema,
  priority: taskPrioritySchema,
  tags: z.array(z.string()).nullable().optional(),
  searchText: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  completedAt: z.string().nullable().optional(),
  taskName: z.string().nullable().optional(),
  taskId: z.number().nullable().optional(),
  assignedTo: z.string().nullable().optional(),
});

export const appwriteRowsListSchema = z.object({
  rows: z.array(appwriteTaskRowSchema),
  total: z.number().int().nonnegative().optional(),
});

export type AppwriteTaskRow = z.infer<typeof appwriteTaskRowSchema>;

export type AppwriteRowsList = z.infer<typeof appwriteRowsListSchema>;
