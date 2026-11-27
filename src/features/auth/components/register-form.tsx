"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { AuthInput } from "@/features/auth/components/auth-input";
import { AuthFormShell } from "@/features/auth/components/auth-form-shell";
import { useAuthAccountLookup } from "@/features/auth/hooks/use-auth-account-lookup";
import { registerSchema, type RegisterFormValues } from "@/features/auth/schemas/register-schema";
import { getAuthReturnPath } from "@/features/auth/utils/get-auth-return-path";
import { apiFetch } from "@/shared/lib/api/client";
import { hasAppwritePublicEnv } from "@/shared/lib/appwrite/env";
import { useToast } from "@/shared/providers/toast-provider";

export function RegisterForm() {
  const router = useRouter();
  const nextPath = getAuthReturnPath(useSearchParams().get("next"));
  const loginHref = `/login?next=${encodeURIComponent(nextPath)}`;
  const { showToast } = useToast();
  const [error, setError] = useState("");
  const [created, setCreated] = useState(false);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });
  const [email, password, confirmation] = useWatch({ control, name: ["email", "password", "confirmPassword"] });
  const accountStatus = useAuthAccountLookup(email);

  async function onSubmit(values: RegisterFormValues) {
    setError("");
    try {
      if (!hasAppwritePublicEnv) throw new Error("服务尚未配置，暂时无法创建账号。");
      const response = await apiFetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || "注册失败，请稍后再试。");
      }
      setCreated(true);
      router.replace(loginHref + "&reason=registered");
    } catch (cause) {
      const message =
        cause instanceof Error && !(cause instanceof TypeError) ? cause.message : "连接失败，请检查网络后重试。";
      setError(message);
      showToast({ title: "注册失败", description: message, tone: "error" });
    }
  }

  return (
    <AuthFormShell
      title="创建账号"
      description="注册 U’s Task，开始整理你的第一份任务清单。"
      footer={
        <>
          已有账号？ <Link href={loginHref}>去登录</Link>
        </>
      }
    >
      <form className="auth-form" noValidate onSubmit={handleSubmit(onSubmit)}>
        <AuthInput
          label="昵称"
          type="text"
          autoComplete="nickname"
          placeholder="怎么称呼你？"
          registration={register("name")}
          error={errors.name?.message}
        />
        <AuthInput
          label="邮箱"
          type="email"
          autoComplete="username"
          placeholder="you@example.com"
          registration={register("email")}
          error={errors.email?.message}
          supportingContent={
            accountStatus === "registered" ? (
              <>
                此邮箱已注册，<Link href={loginHref}>去登录</Link>
              </>
            ) : undefined
          }
        />
        <AuthInput
          label="密码"
          type="password"
          autoComplete="new-password"
          placeholder="设置登录密码"
          registration={register("password")}
          error={errors.password?.message}
          supportingContent={password.length >= 8 ? "已满足至少 8 个字符" : "至少 8 个字符"}
        />
        <AuthInput
          label="确认密码"
          type="password"
          autoComplete="new-password"
          placeholder="再次输入密码"
          registration={register("confirmPassword")}
          error={errors.confirmPassword?.message}
          supportingContent={
            confirmation ? (confirmation === password ? "两次密码一致" : "两次输入的密码不一致") : undefined
          }
        />
        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="auth-submit" disabled={isSubmitting || created}>
          {created ? "账号已创建" : isSubmitting ? "创建中…" : "创建账号"}
        </button>
      </form>
    </AuthFormShell>
  );
}
