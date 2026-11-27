"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { AuthInput } from "@/features/auth/components/auth-input";
import { AuthFormShell } from "@/features/auth/components/auth-form-shell";
import { useAuthAccountLookup } from "@/features/auth/hooks/use-auth-account-lookup";
import { useAuth, type AuthEnvelope } from "@/features/auth/providers/auth-provider";
import { loginSchema, type LoginFormValues } from "@/features/auth/schemas/login-schema";
import { getAuthReturnPath } from "@/features/auth/utils/get-auth-return-path";
import { useTaskStore } from "@/features/tasks/store/task-store";
import { useDesktopRuntime } from "@/shared/hooks/use-desktop-runtime";
import { apiFetch } from "@/shared/lib/api/client";
import { hasAppwritePublicEnv } from "@/shared/lib/appwrite/env";
import { useToast } from "@/shared/providers/toast-provider";

export function LoginForm() {
  const isDesktop = useDesktopRuntime();
  const params = useSearchParams();
  const nextPath = getAuthReturnPath(params.get("next"));
  const { applyAuthEnvelope } = useAuth();
  const { showToast } = useToast();
  const [error, setError] = useState("");
  const [signedIn, setSignedIn] = useState(false);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  const email = useWatch({ control, name: "email" });
  const accountStatus = useAuthAccountLookup(email);

  async function onSubmit(values: LoginFormValues) {
    if (signedIn) return;
    setError("");
    try {
      if (!hasAppwritePublicEnv) throw new Error("服务尚未配置，暂时无法登录。");
      const response = await apiFetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.message || "登录失败，请稍后再试。");
      if (!isAuthEnvelope(payload)) throw new Error("登录状态未能确认，请重试。");
      applyAuthEnvelope(payload);
      setSignedIn(true);
      await useTaskStore.getState().syncTasks(payload.user.id);
      if (useTaskStore.getState().error) {
        setError("账号已登录，任务暂时未能同步。可以先进入工作台。");
        return;
      }
      window.location.replace(nextPath);
    } catch (cause) {
      const message =
        cause instanceof Error && !(cause instanceof TypeError) ? cause.message : "连接失败，请检查网络后重试。";
      setError(message);
      showToast({ title: "登录失败", description: message, tone: "error" });
    }
  }

  return (
    <AuthFormShell
      title="欢迎回来"
      description={
        params.get("reason") === "registered"
          ? "账号已创建，登录后即可进入工作台。"
          : isDesktop
            ? "本地使用无需登录。登录后可在设置中连接云端。"
            : "登录后，继续你的任务计划。"
      }
      footer={
        <>
          还没有账号？ <Link href={`/register?next=${encodeURIComponent(nextPath)}`}>立即注册</Link>
        </>
      }
    >
      <form className="auth-form" noValidate onSubmit={handleSubmit(onSubmit)}>
        <AuthInput
          label="邮箱"
          type="email"
          autoComplete="username"
          placeholder="you@example.com"
          registration={register("email")}
          error={errors.email?.message}
          supportingContent={accountStatus === "available" ? "若为首次使用，请先注册账号。" : undefined}
        />
        <AuthInput
          label="密码"
          type="password"
          autoComplete="current-password"
          placeholder="输入你的密码"
          registration={register("password")}
          error={errors.password?.message}
        />
        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}
        {signedIn && error ? (
          <a className="auth-submit" href={nextPath}>
            进入工作台
          </a>
        ) : (
          <button className="auth-submit" type="submit" disabled={isSubmitting || signedIn}>
            {signedIn ? "正在进入工作台…" : isSubmitting ? "正在登录…" : "登录"}
          </button>
        )}
      </form>
    </AuthFormShell>
  );
}

function isAuthEnvelope(value: Partial<AuthEnvelope> | null): value is AuthEnvelope {
  return Boolean(value?.user?.id && value.profile);
}
