"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { AuthFormShell } from "@/components/auth/auth-form-shell";
import { loginSchema, type LoginFormValues } from "@/features/auth/schemas/login-schema";
import { hasAppwritePublicEnv } from "@/lib/appwrite/env";
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

  const navigateToDashboard = () => {
    if (typeof window !== "undefined") {
      window.location.assign("/dashboard");
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  };

  const onSubmit = async (values: LoginFormValues) => {
    setSubmitError(null);

    if (!hasAppwritePublicEnv) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      setSubmittedEmail(values.email);
      showToast({
        title: "登录已完成",
        description: `已用本地模式登录 ${values.email}。`,
        tone: "success",
      });
      navigateToDashboard();
      return;
    }

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(values),
    });

    const payload = (await response.json().catch(() => null)) as
      | { message?: string }
      | null;

    if (!response.ok) {
      const message = payload?.message || "登录失败，请稍后再试。";
      setSubmitError(message);
      showToast({
        title: "登录失败",
        description: message,
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
    navigateToDashboard();
  };

  return (
    <AuthFormShell
      eyebrow="登录"
      title="回到你的工作台"
      description={
        hasAppwritePublicEnv
          ? "使用 Appwrite 账号登录后，就会载入你的真实任务数据与个人资料。"
          : "你还没有完成 Appwrite 环境变量配置，所以这里会先以本地演示模式运行。"
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
          className="ui-sans"
          style={{
            border: "1px solid transparent",
            padding: "14px 18px",
            borderRadius: 999,
            background: "linear-gradient(135deg, var(--primary), var(--data-cyan))",
            color: "var(--primary-foreground)",
            fontWeight: 700,
            opacity: isSubmitting ? 0.8 : 1,
            boxShadow: "0 12px 24px rgba(37,99,235,0.18)",
          }}
        >
          {isSubmitting ? "登录中..." : "进入仪表盘"}
        </button>
        {submittedEmail ? (
          <p style={{ margin: 0, color: "var(--success)", fontSize: "0.95rem" }}>
            {hasAppwritePublicEnv ? `已登录 ${submittedEmail}。` : `演示模式已接受 ${submittedEmail} 的登录。`}
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
      <span className="ui-sans" style={{ fontSize: "0.95rem", fontWeight: 600 }}>{label}</span>
      <input
        type={type}
        placeholder={placeholder}
        {...registration}
        className="ui-sans"
        style={{
          borderRadius: 16,
          border: `1px solid ${error ? "rgba(178,64,55,0.48)" : "var(--border)"}`,
          padding: "14px 16px",
          background: "rgba(255,255,255,0.92)",
        }}
      />
      {error ? <span style={{ color: "var(--danger)", fontSize: "0.9rem" }}>{error}</span> : null}
    </label>
  );
}
