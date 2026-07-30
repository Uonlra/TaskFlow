"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { AuthInput } from "@/features/auth/components/auth-input";
import { AuthFormShell } from "@/features/auth/components/auth-form-shell";
import { useAuthPreviewState } from "@/features/auth/components/auth-preview-state";
import { useAuthAccountLookup } from "@/features/auth/hooks/use-auth-account-lookup";
import { registerSchema, type RegisterFormValues } from "@/features/auth/schemas/register-schema";
import { hasAppwritePublicEnv } from "@/shared/lib/appwrite/env";
import { useToast } from "@/shared/providers/toast-provider";

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = getSafeNextPath(searchParams.get("next"));
  const { showToast } = useToast();
  const {
    preloginAccountStatus,
    setPreloginAccountStatus,
    setPreloginEmail,
    setPreloginName,
  } = useAuthPreviewState();
  const [submittedName, setSubmittedName] = useState<string | null>(null);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });
  const watchedName = watch("name");
  const watchedEmail = watch("email");
  useAuthAccountLookup(watchedEmail);

  useEffect(() => {
    setPreloginName(watchedName.trim());
    setPreloginEmail(watchedEmail.trim());

    return () => {
      setPreloginAccountStatus("idle");
      setPreloginName("");
      setPreloginEmail("");
    };
  }, [setPreloginAccountStatus, setPreloginEmail, setPreloginName, watchedEmail, watchedName]);

  const navigateToLogin = () => {
    const loginPath = `/login?reason=registered&next=${encodeURIComponent(nextPath)}`;

    if (typeof window !== "undefined") {
      window.location.assign(loginPath);
      return;
    }

    router.replace(loginPath);
    router.refresh();
  };

  const onSubmit = async (values: RegisterFormValues) => {
    setSubmitError(null);
    setSubmitMessage(null);

    if (!hasAppwritePublicEnv) {
      const message = "服务尚未配置，暂时无法创建账号。";
      setSubmitError(message);
      showToast({ title: "暂时无法注册", description: message, tone: "error" });
      return;
    }

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(values),
    });

    const payload = (await response.json().catch(() => null)) as
      | {
          message?: string;
        }
      | null;

    if (!response.ok) {
      const message = payload?.message || "注册失败，请稍后再试。";
      setSubmitError(message);
      showToast({
        title: "注册失败",
        description: message,
        tone: "error",
      });
      return;
    }

    setSubmittedName(values.name);
    setPreloginName(values.name.trim());
    setPreloginEmail(values.email.trim());
    const message = payload?.message || "账号已创建，请登录。";
    setSubmitMessage(message);
    showToast({
      title: "账号已创建",
      description: message,
      tone: "success",
    });
    navigateToLogin();
  };

  return (
    <AuthFormShell
      eyebrow="注册"
      title="创建账号"
      description="填写信息后，账号会安全保存，随后登录继续使用任务本。"
      footer={
        <>
          已经有账号了？{" "}
          <Link href={`/login?next=${encodeURIComponent(nextPath)}`} className="auth-form-footer-link">
            去登录
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
        <AuthInput
          label="姓名"
          type="text"
          placeholder="请输入你的昵称"
          error={errors.name?.message}
          registration={register("name")}
          icon="U"
        />
        <AuthInput
          label="邮箱"
          type="email"
          placeholder="请输入邮箱地址"
          error={errors.email?.message}
          registration={register("email")}
          icon="@"
        />
        <AccountLookupMessage status={preloginAccountStatus} />
        <AuthInput
          label="密码"
          type="password"
          placeholder="请输入密码"
          error={errors.password?.message}
          registration={register("password")}
          icon="*"
        />
        <AuthInput
          label="确认密码"
          type="password"
          placeholder="请再次输入密码"
          error={errors.confirmPassword?.message}
          registration={register("confirmPassword")}
          icon="*"
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="auth-submit-button"
        >
          {isSubmitting ? "创建中..." : "创建任务本"}
        </button>
        {submittedName ? (
          <p className="auth-form-message auth-form-message--success">
            {`已为 ${submittedName} 创建账号。`}
          </p>
        ) : null}
        {submitMessage ? <p className="auth-form-message auth-form-message--success">{submitMessage}</p> : null}
        {submitError ? <p className="auth-form-message auth-form-message--error">{submitError}</p> : null}
      </form>
    </AuthFormShell>
  );
}

function AccountLookupMessage({
  status,
}: {
  status: ReturnType<typeof useAuthPreviewState>["preloginAccountStatus"];
}) {
  if (status === "idle") {
    return null;
  }

  const message =
    status === "checking"
      ? "正在确认邮箱状态..."
      : status === "registered"
        ? "这个邮箱已经有记录了，直接登录会更快。"
        : status === "available"
          ? "这个邮箱可以创建新记录，进度会从 0 开始。"
          : "暂时无法确认邮箱状态，可以继续填写注册信息。";

  return <p className="auth-form-message auth-form-message--hint">{message}</p>;
}

function getSafeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  return value;
}