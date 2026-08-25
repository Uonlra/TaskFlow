import { z } from "zod";

import { taskPrioritySchema, taskStatusSchema } from "@/features/tasks/types/task-values";

export const taskSchema = z.object({
  title: z.string().min(1, "标题至少需要 1 个字符。"),
  description: z.string(),
  status: taskStatusSchema,
  priority: taskPrioritySchema,
  tags: z.string().optional(),
  dueDate: z.string().optional(),
});

export type TaskFormValues = z.infer<typeof taskSchema>;
