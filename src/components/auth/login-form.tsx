"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { AuthFormShell } from "@/components/auth/auth-form-shell";
import { loginSchema, type LoginFormValues } from "@/features/auth/schemas/login-schema";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { useToast } from "@/providers/toast-provider";

export function LoginForm() {
  const router = useRouter();
  const { showToast } = useToast();
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setSubmitError(null);

    if (!hasSupabaseEnv) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      setSubmittedEmail(values.email);
      showToast({
        title: "演示登录已完成",
        description: `已用本地演示模式登录 ${values.email}。`,
        tone: "success",
      });
      router.push("/dashboard");
      return;
    }

    const client = getSupabaseBrowserClient();

    if (!client) {
      const message = "Supabase 客户端不可用，请检查环境变量配置。";
      setSubmitError(message);
      showToast({
        title: "登录失败",
        description: message,
        tone: "error",
      });
      return;
    }

    const { error } = await client.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error) {
      setSubmitError(error.message);
      showToast({
        title: "登录失败",
        description: error.message,
        tone: "error",
      });
      return;
    }

    setSubmittedEmail(values.email);
    showToast({
      title: "欢迎回来",
      description: `当前已登录 ${values.email}。`,
      tone: "success",
    });
    router.push("/dashboard");
  };

  return (
    <AuthFormShell
      eyebrow="登录"
      title="回到你的工作台"
      description={
        hasSupabaseEnv
          ? "使用 Supabase 账号登录后，就会载入你的真实任务数据与个人资料。"
          : "你还没有完成 Supabase 环境变量配置，所以这里会先以本地演示模式运行。"
      }
      footer={
        <>
          还没有账号？{" "}
          <Link href="/register" style={{ color: "var(--primary)", fontWeight: 700 }}>
            立即注册
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} style={{ display: "grid", gap: 14 }}>
        <AuthInput
          label="邮箱"
          type="email"
          placeholder="name@example.com"
          error={errors.email?.message}
          registration={register("email")}
        />
        <AuthInput
          label="密码"
          type="password"
          placeholder="至少 8 位"
          error={errors.password?.message}
          registration={register("password")}
        />
        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            border: 0,
            padding: "14px 18px",
            borderRadius: 999,
            background: "var(--primary)",
            color: "var(--primary-foreground)",
            fontWeight: 700,
            opacity: isSubmitting ? 0.8 : 1,
          }}
        >
          {isSubmitting ? "登录中..." : "进入仪表盘"}
        </button>
        {submittedEmail ? (
          <p style={{ margin: 0, color: "var(--success)", fontSize: "0.95rem" }}>
            {hasSupabaseEnv ? `已登录 ${submittedEmail}。` : `演示模式已接受 ${submittedEmail} 的登录。`}
          </p>
        ) : null}
        {submitError ? <p style={{ margin: 0, color: "var(--danger)", fontSize: "0.95rem" }}>{submitError}</p> : null}
      </form>
    </AuthFormShell>
  );
}

type AuthInputProps = {
  label: string;
  type: string;
  placeholder: string;
  error?: string;
  registration: UseFormRegisterReturn;
};

function AuthInput({ label, type, placeholder, error, registration }: AuthInputProps) {
  return (
    <label style={{ display: "grid", gap: 8 }}>
      <span style={{ fontSize: "0.95rem", fontWeight: 600 }}>{label}</span>
      <input
        type={type}
        placeholder={placeholder}
        {...registration}
        style={{
          borderRadius: 16,
          border: `1px solid ${error ? "rgba(178,64,55,0.48)" : "var(--border)"}`,
          padding: "14px 16px",
          background: "rgba(255,255,255,0.9)",
        }}
      />
      {error ? <span style={{ color: "var(--danger)", fontSize: "0.9rem" }}>{error}</span> : null}
    </label>
  );
}
