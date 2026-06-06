"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { AuthInput } from "@/components/auth/auth-input";
import { AuthFormShell } from "@/components/auth/auth-form-shell";
import { loginSchema, type LoginFormValues } from "@/features/auth/schemas/login-schema";
import { hasAppwritePublicEnv } from "@/lib/appwrite/env";
import { useToast } from "@/providers/toast-provider";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
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

  useEffect(() => {
    const reason = searchParams.get("reason");

    if (reason === "email-verified") {
      setSubmitError(null);
      showToast({
        title: "邮箱验证完成",
        description: "你的邮箱已经验证成功，现在可以登录进入工作台。",
        tone: "success",
      });
      return;
    }

    if (reason === "verify-email") {
      setSubmitError("请先完成邮箱验证后再进入工作台。");
    }
  }, [searchParams, showToast]);

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
      | { message?: string; requiresEmailVerification?: boolean }
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
      title="欢迎回来"
      description={
        hasAppwritePublicEnv
          ? "登录以继续你的任务管理之旅。"
          : "当前以本地演示模式运行，登录后即可进入工作台。"
      }
      footer={
        <>
          还没有账号？{" "}
          <Link href="/register" className="auth-form-footer-link">
            立即注册
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
        <AuthInput
          label="邮箱"
          type="email"
          placeholder="请输入邮箱地址"
          error={errors.email?.message}
          registration={register("email")}
          icon="@"
        />
        <AuthInput
          label="密码"
          type="password"
          placeholder="请输入密码"
          error={errors.password?.message}
          registration={register("password")}
          icon="*"
        />
        <div className="auth-form-options">
          <label className="auth-remember-option">
            <input type="checkbox" name="remember" />
            <span aria-hidden="true" />
            <strong>记住我</strong>
          </label>
          <button type="button" className="auth-forgot-button" title="密码找回功能将在后续版本接入">
            忘记密码？
          </button>
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="auth-submit-button"
        >
          {isSubmitting ? "登录中..." : "进入仪表盘"}
        </button>
        <div className="auth-form-divider">
          <span>安全登录</span>
        </div>
        {submittedEmail ? (
          <p className="auth-form-message auth-form-message--success">
            {hasAppwritePublicEnv ? `已登录 ${submittedEmail}。` : `演示模式已接受 ${submittedEmail} 的登录。`}
          </p>
        ) : null}
        {submitError ? <p className="auth-form-message auth-form-message--error">{submitError}</p> : null}
      </form>
    </AuthFormShell>
  );
}
