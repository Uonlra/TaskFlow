import { z } from "zod";

export const registerSchema = z
  .object({
    name: z.string().min(2, "姓名至少需要 2 个字符。"),
    email: z.email("请输入有效的邮箱地址。"),
    password: z.string().min(8, "密码至少需要 8 位。"),
    confirmPassword: z.string().min(8, "请再次输入密码。"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "两次输入的密码不一致。",
    path: ["confirmPassword"],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;
