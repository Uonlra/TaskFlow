"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { AuthInput } from "@/components/auth/auth-input";
import { AuthFormShell } from "@/components/auth/auth-form-shell";
import { registerSchema, type RegisterFormValues } from "@/features/auth/schemas/register-schema";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getPublicSiteUrl, hasSupabaseEnv } from "@/lib/supabase/env";
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

    if (!hasSupabaseEnv) {
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

    const client = getSupabaseBrowserClient();

    if (!client) {
      const message = "Supabase 客户端不可用，请检查环境变量配置。";
      setSubmitError(message);
      showToast({
        title: "注册失败",
        description: message,
        tone: "error",
      });
      return;
    }

    const { data, error } = await client.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: {
          name: values.name,
        },
        emailRedirectTo: getPublicSiteUrl("/auth/callback?next=/dashboard"),
      },
    });

    if (error) {
      setSubmitError(error.message);
      showToast({
        title: "注册失败",
        description: error.message,
        tone: "error",
      });
      return;
    }

    setSubmittedName(values.name);

    if (data.session) {
      showToast({
        title: "账号已创建",
        description: `当前已登录 ${values.email}。`,
        tone: "success",
      });
      navigateToDashboard();
      return;
    }

    const message = "账号已创建。请先去邮箱完成验证，然后再回来登录。";
    setSubmitMessage(message);
    showToast({
      title: "请查收邮箱",
      description: message,
      tone: "info",
    });
  };

  return (
    <AuthFormShell
      eyebrow="注册"
      title="创建账号"
      description={
        hasSupabaseEnv
          ? "填写信息后即可开启你的任务管理空间。"
          : "当前以本地演示模式运行，创建后会直接进入工作台。"
      }
      footer={
        <>
          已经有账号了？{" "}
          <Link href="/login" className="auth-form-footer-link">
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
          {isSubmitting ? "创建中..." : "创建工作台"}
        </button>
        {submittedName ? (
          <p className="auth-form-message auth-form-message--success">
            {hasSupabaseEnv ? `已为 ${submittedName} 创建账号。` : `已为 ${submittedName} 创建演示工作台。`}
          </p>
        ) : null}
        {submitMessage ? <p className="auth-form-message auth-form-message--success">{submitMessage}</p> : null}
        {submitError ? <p className="auth-form-message auth-form-message--error">{submitError}</p> : null}
      </form>
    </AuthFormShell>
  );
}
