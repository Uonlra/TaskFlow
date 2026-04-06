import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("请输入有效的邮箱地址。"),
  password: z.string().min(8, "密码至少需要 8 位。"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
