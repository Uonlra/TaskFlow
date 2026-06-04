"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { AuthFormShell } from "@/components/auth/auth-form-shell";
import { registerSchema, type RegisterFormValues } from "@/features/auth/schemas/register-schema";
import { hasAppwritePublicEnv } from "@/lib/appwrite/env";
import { useToast } from "@/providers/toast-provider";

export function RegisterForm() {
  const router = useRouter();
  const { showToast } = useToast();
  const [submittedName, setSubmittedName] = useState<string | null>(null);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
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

  const navigateToDashboard = () => {
    if (typeof window !== "undefined") {
      window.location.assign("/dashboard");
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  };

  const onSubmit = async (values: RegisterFormValues) => {
    setSubmitError(null);
    setSubmitMessage(null);

    if (!hasAppwritePublicEnv) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      setSubmittedName(values.name);
      showToast({
        title: "本地账号已创建",
        description: `${values.name} 的本地工作台已经准备好了。`,
        tone: "success",
      });
      navigateToDashboard();
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
          verificationRequested?: boolean;
          requiresEmailVerification?: boolean;
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
    const requiresEmailVerification = Boolean(payload?.requiresEmailVerification);
    const message =
      payload?.message ||
      (requiresEmailVerification
        ? "账号已创建，请先完成邮箱验证后再登录。"
        : `账号已创建，当前已登录 ${values.email}。`);
    setSubmitMessage(message);
    showToast({
      title: requiresEmailVerification ? "请查收邮箱" : "账号已创建",
      description: message,
      tone: requiresEmailVerification ? "info" : "success",
    });

    if (!requiresEmailVerification) {
      navigateToDashboard();
    }
  };

  return (
    <AuthFormShell
      eyebrow="注册"
      title="创建你的中文工作台"
      description={
        hasAppwritePublicEnv
          ? "注册后会创建真实的 Appwrite 账号。如果项目开启了邮箱验证，我们会先提醒你完成确认。"
          : "你还没有完成 Appwrite 环境变量配置，所以这里会先以本地演示模式运行。"
      }
      footer={
        <>
          已经有账号了？{" "}
          <Link href="/login" style={{ color: "var(--primary)", fontWeight: 700 }}>
            去登录
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} style={{ display: "grid", gap: 14 }}>
        <AuthInput
          label="姓名"
          type="text"
          placeholder="请输入你的昵称"
          error={errors.name?.message}
          registration={register("name")}
        />
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
        <AuthInput
          label="确认密码"
          type="password"
          placeholder="请再次输入密码"
          error={errors.confirmPassword?.message}
          registration={register("confirmPassword")}
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="ui-sans auth-submit"
          style={{ opacity: isSubmitting ? 0.8 : 1 }}
        >
          {isSubmitting ? "创建中..." : "创建工作台"}
        </button>
        {submittedName ? (
          <p style={{ margin: 0, color: "var(--success)", fontSize: "0.95rem" }}>
            {hasAppwritePublicEnv ? `已为 ${submittedName} 创建账号。` : `已为 ${submittedName} 创建演示工作台。`}
          </p>
        ) : null}
        {submitMessage ? <p style={{ margin: 0, color: "var(--success)", fontSize: "0.95rem" }}>{submitMessage}</p> : null}
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
        className={`ui-sans auth-input${error ? " auth-input--invalid" : ""}`}
      />
      {error ? <span style={{ color: "var(--danger)", fontSize: "0.9rem" }}>{error}</span> : null}
    </label>
  );
}
