"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { AuthInput } from "@/components/auth/auth-input";
import { AuthFormShell } from "@/components/auth/auth-form-shell";
import { useAuthPreviewState } from "@/components/auth/auth-preview-state";
import { useAuthAccountLookup } from "@/components/auth/use-auth-account-lookup";
import type { AuthEnvelope } from "@/providers/auth-provider";
import { useAuth } from "@/providers/auth-provider";
import { loginSchema, type LoginFormValues } from "@/features/auth/schemas/login-schema";
import { hasAppwritePublicEnv } from "@/lib/appwrite/env";
import { useToast } from "@/providers/toast-provider";
import { useTaskStore } from "@/store/task-store";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const { applyAuthEnvelope } = useAuth();
  const syncTasks = useTaskStore((state) => state.syncTasks);
  const {
    preloginAccountStatus,
    setPreloginAccountStatus,
    setPreloginEmail,
    setPreloginName,
  } = useAuthPreviewState();
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isPreviewUnlocked, setIsPreviewUnlocked] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });
  const watchedEmail = watch("email");
  useAuthAccountLookup(watchedEmail);

  useEffect(() => {
    setPreloginName("");
    setPreloginEmail(watchedEmail.trim());

    return () => {
      setPreloginAccountStatus("idle");
      setPreloginName("");
      setPreloginEmail("");
    };
  }, [setPreloginAccountStatus, setPreloginEmail, setPreloginName, watchedEmail]);

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
    setIsPreviewLoading(false);
    setIsPreviewUnlocked(false);

    if (!hasAppwritePublicEnv) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      setSubmittedEmail(values.email);
      setPreloginName("");
      setPreloginEmail(values.email.trim());
      setIsPreviewUnlocked(true);
      showToast({
        title: "登录已完成",
        description: `已用本地模式登录 ${values.email}，左侧预览已更新。`,
        tone: "success",
      });
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
      | AuthEnvelope
      | null;

    if (!response.ok) {
      const message = getAuthErrorMessage(payload);
      setSubmitError(message);
      showToast({
        title: "登录失败",
        description: message,
        tone: "error",
      });
      return;
    }

    setIsPreviewLoading(true);

    setSubmittedEmail(values.email);
    setPreloginName("");
    setPreloginEmail(values.email.trim());
    if (!isAuthEnvelope(payload)) {
      const message = "登录成功，但返回数据不完整，请刷新后再试。";
      setSubmitError(message);
      showToast({
        title: "登录状态异常",
        description: message,
        tone: "error",
      });
      return;
    }

    try {
      applyAuthEnvelope(payload);
      await syncTasks(payload.user.id);
      setIsPreviewUnlocked(true);
      showToast({
        title: "登录成功",
        description: "左侧已经自动更新为你的真实任务概览。",
        tone: "success",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "任务预览同步失败，请稍后再试。";
      setSubmitError(message);
      showToast({
        title: "预览同步失败",
        description: message,
        tone: "error",
      });
    } finally {
      setIsPreviewLoading(false);
    }
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
        <AccountLookupMessage mode="login" status={preloginAccountStatus} />
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
        <button type="submit" disabled={isSubmitting} className="auth-submit-button">
          {isSubmitting ? "验证中..." : "验证身份"}
        </button>
        <div className="auth-form-divider">
          <span>安全登录</span>
        </div>
        {submittedEmail ? (
          <PostLoginActions
            isPreviewLoading={isPreviewLoading}
            isPreviewUnlocked={isPreviewUnlocked}
            onEnterDashboard={navigateToDashboard}
            submittedEmail={submittedEmail}
          />
        ) : null}
        {submitError ? <p className="auth-form-message auth-form-message--error">{submitError}</p> : null}
      </form>
    </AuthFormShell>
  );
}

function isAuthEnvelope(payload: unknown): payload is AuthEnvelope {
  return (
    payload !== null &&
    typeof payload === "object" &&
    "user" in payload &&
    "profile" in payload
  );
}

function getAuthErrorMessage(payload: unknown) {
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = (payload as { message?: unknown }).message;

    if (typeof message === "string" && message) {
      return message;
    }
  }

  return "登录失败，请稍后再试。";
}

function AccountLookupMessage({
  mode,
  status,
}: {
  mode: "login";
  status: ReturnType<typeof useAuthPreviewState>["preloginAccountStatus"];
}) {
  if (status === "idle") {
    return null;
  }

  const message =
    status === "checking"
      ? "正在确认邮箱状态..."
      : status === "registered"
        ? "这个邮箱看起来已有工作台，输入密码后即可登录。"
        : status === "available"
          ? "这个邮箱还没有工作台。可以继续尝试登录，也可以先去注册。"
          : "暂时无法确认邮箱状态，可以继续登录。";

  return (
    <p className={`auth-form-message auth-form-message--hint auth-form-message--hint-${mode}`}>
      {message}
    </p>
  );
}

function PostLoginActions({
  isPreviewLoading,
  isPreviewUnlocked,
  onEnterDashboard,
  submittedEmail,
}: {
  isPreviewLoading: boolean;
  isPreviewUnlocked: boolean;
  onEnterDashboard: () => void;
  submittedEmail: string;
}) {
  return (
    <div className="auth-post-login-actions">
      <p className="auth-form-message auth-form-message--success">
        {isPreviewLoading
          ? `已验证 ${submittedEmail}，正在同步左侧预览。`
          : isPreviewUnlocked
            ? `已验证 ${submittedEmail}，左侧预览已经更新。`
            : `已验证 ${submittedEmail}。`}
      </p>
      <button type="button" className="auth-submit-button" onClick={onEnterDashboard}>
        进入仪表盘
      </button>
    </div>
  );
}
