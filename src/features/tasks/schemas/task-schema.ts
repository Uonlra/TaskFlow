import { z } from "zod";

export const taskSchema = z.object({
  title: z.string().min(1, "标题至少需要 1 个字符。"),
  description: z.string().min(3, "说明至少需要 3 个字符。"),
  status: z.enum(["todo", "in_progress", "done"]),
  priority: z.enum(["low", "medium", "high"]),
  tags: z.string().optional(),
  dueDate: z.string().optional(),
});

export type TaskFormValues = z.infer<typeof taskSchema>;
