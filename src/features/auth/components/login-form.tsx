"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { AuthInput } from "@/features/auth/components/auth-input";
import { AuthFormShell } from "@/features/auth/components/auth-form-shell";
import { useAuthPreviewState } from "@/features/auth/components/auth-preview-state";
import { useAuthAccountLookup } from "@/features/auth/hooks/use-auth-account-lookup";
import type { AuthEnvelope } from "@/features/auth/providers/auth-provider";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { loginSchema, type LoginFormValues } from "@/features/auth/schemas/login-schema";
import { hasAppwritePublicEnv } from "@/shared/lib/appwrite/env";
import { useToast } from "@/shared/providers/toast-provider";
import { useTaskStore } from "@/features/tasks/store/task-store";

export function LoginForm() {
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const nextPath = getSafeNextPath(searchParams.get("next"));
  const { applyAuthEnvelope } = useAuth();
  const syncTasks = useTaskStore((state) => state.syncTasks);
  const {
    preloginAccountStatus,
    previewPhase,
    setPreloginAccountStatus,
    setPreloginEmail,
    setPreloginName,
    setPreviewPhase,
  } = useAuthPreviewState();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
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
      setPreviewPhase("anonymous");
    };
  }, [setPreloginAccountStatus, setPreloginEmail, setPreloginName, setPreviewPhase, watchedEmail]);

  useEffect(() => {
    if (searchParams.get("reason") !== "registered") {
      return;
    }

    showToast({
      title: "账号已创建",
      description: "请使用刚才注册的邮箱和密码登录。",
      tone: "success",
    });
  }, [searchParams, showToast]);

  const enterDashboard = () => {
    window.location.assign(nextPath);
  };

  const onSubmit = async (values: LoginFormValues) => {
    setSubmitError(null);
    setPreviewPhase("hydrating");

    if (!hasAppwritePublicEnv) {
      const message = "服务尚未配置，暂时无法登录。";
      setPreviewPhase("failed");
      setSubmitError(message);
      showToast({ title: "暂时无法登录", description: message, tone: "error" });
      return;
    }

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const payload = (await response.json().catch(() => null)) as { message?: string } | AuthEnvelope | null;

    if (!response.ok) {
      const message = getAuthErrorMessage(payload);
      setPreviewPhase("failed");
      setSubmitError(message);
      showToast({ title: "登录失败", description: message, tone: "error" });
      return;
    }

    if (!isAuthEnvelope(payload)) {
      const message = "登录成功，但返回数据不完整，请刷新后再试。";
      setPreviewPhase("failed");
      setSubmitError(message);
      showToast({ title: "登录状态异常", description: message, tone: "error" });
      return;
    }

    try {
      applyAuthEnvelope(payload);
      await syncTasks(payload.user.id);
      const taskSyncError = useTaskStore.getState().error;

      if (taskSyncError) {
        throw new Error(taskSyncError);
      }

      setPreviewPhase("ready");
      showToast({ title: "工作台已连接", description: "请确认左侧任务预览后继续。", tone: "success" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "任务同步失败，请稍后再试。";
      setPreviewPhase("failed");
      setSubmitError(message);
      showToast({ title: "登录失败", description: message, tone: "error" });
    }
  };

  const isPreviewReady = previewPhase === "ready";
  const isHydrating = previewPhase === "hydrating";

  return (
    <AuthFormShell
      eyebrow={isPreviewReady ? "已连接" : "登录"}
      title={isPreviewReady ? "工作台已准备好" : "欢迎回来"}
      description={isPreviewReady ? "任务已同步，确认后返回刚才的功能页。" : "登录后继续整理你的任务。"}
      footer={isPreviewReady ? <span className="auth-preview-footer">登录身份已确认，下一步返回刚才的页面。</span> : <>还没有账号？ <Link href={`/register?next=${encodeURIComponent(nextPath)}`} className="auth-form-footer-link">立即注册</Link></>}
    >
      {isPreviewReady ? (
        <div className="auth-preview-confirmation">
          <p className="auth-form-message auth-form-message--success">任务数据已同步到左侧工作台。</p>
          <button type="button" className="auth-submit-button" onClick={enterDashboard}>
            继续
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
          <AuthInput label="邮箱" type="email" placeholder="请输入邮箱地址" error={errors.email?.message} registration={register("email")} icon="@" />
          <AccountLookupMessage status={preloginAccountStatus} />
          <AuthInput label="密码" type="password" placeholder="请输入密码" error={errors.password?.message} registration={register("password")} icon="*" />
          <button type="submit" disabled={isSubmitting || isHydrating} className="auth-submit-button">
            {isHydrating ? "正在连接工作台..." : "登录"}
          </button>
          {submitError ? <p className="auth-form-message auth-form-message--error">{submitError}</p> : null}
        </form>
      )}
    </AuthFormShell>
  );
}

function isAuthEnvelope(payload: unknown): payload is AuthEnvelope {
  return payload !== null && typeof payload === "object" && "user" in payload && "profile" in payload;
}

function getAuthErrorMessage(payload: unknown) {
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = (payload as { message?: unknown }).message;
    if (typeof message === "string" && message) return message;
  }
  return "登录失败，请稍后再试。";
}

function AccountLookupMessage({ status }: { status: ReturnType<typeof useAuthPreviewState>["preloginAccountStatus"] }) {
  if (status === "idle") return null;
  const message = status === "checking"
    ? "正在确认邮箱状态..."
    : status === "registered"
      ? "这个邮箱看起来已经有记录，输入密码后即可登录。"
      : status === "available"
        ? "这个邮箱还没有记录。可以继续尝试登录，也可以先去注册。"
        : "暂时无法确认邮箱状态，可以继续登录。";
  return <p className="auth-form-message auth-form-message--hint auth-form-message--hint-login">{message}</p>;
}

function getSafeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  return value;
}