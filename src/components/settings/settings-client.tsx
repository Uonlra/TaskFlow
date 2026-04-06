"use client";

import type { CSSProperties } from "react";
import { useForm } from "react-hook-form";

import type { ProfileFormValues } from "@/features/auth/types/profile.types";
import { useAuth } from "@/providers/auth-provider";
import { useToast } from "@/providers/toast-provider";

export function SettingsClient() {
  const { profile, user, isConfigured, isProfileLoading, saveProfile } = useAuth();
  const { showToast } = useToast();
  const {
    register,
    handleSubmit,
    watch,
    formState: { isSubmitting },
  } = useForm<ProfileFormValues>({
    values: {
      fullName: profile?.fullName ?? "",
      avatarUrl: profile?.avatarUrl ?? "",
    },
  });
  const avatarPreview = watch("avatarUrl");
  const namePreview = watch("fullName");

  const onSubmit = async (values: ProfileFormValues) => {
    try {
      await saveProfile(values);
      showToast({
        title: "资料已保存",
        description: "你的工作台身份信息已经更新。",
        tone: "success",
      });
    } catch (error) {
      showToast({
        title: "资料更新失败",
        description: error instanceof Error ? error.message : "请稍后再试。",
        tone: "error",
      });
    }
  };

  return (
    <section style={{ display: "grid", gap: 24 }}>
      {!isConfigured ? (
        <section className="card-surface" style={{ borderRadius: 28, padding: 24 }}>
          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.7 }}>
            当前还没有连接 Supabase，所以这里的资料修改只会影响本地演示会话。
          </p>
        </section>
      ) : null}

      <section className="card-surface" style={{ borderRadius: 28, padding: 24 }}>
        <div style={{ display: "grid", gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: "1.2rem" }}>工作台身份信息</h2>
          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.7 }}>
            调整会在顶栏、设置页和其他区域展示的姓名与头像地址。
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: "grid", gap: 16, marginTop: 24 }}>
          <label style={{ display: "grid", gap: 8 }}>
            <span style={{ fontWeight: 600 }}>姓名</span>
            <input
              {...register("fullName")}
              placeholder="请输入你的姓名或常用称呼"
              style={inputStyle}
              disabled={isProfileLoading}
            />
          </label>

          <label style={{ display: "grid", gap: 8 }}>
            <span style={{ fontWeight: 600 }}>头像地址</span>
            <input
              {...register("avatarUrl")}
              placeholder="https://example.com/avatar.jpg"
              style={inputStyle}
              disabled={isProfileLoading}
            />
          </label>

          <div style={{ display: "grid", gap: 8 }}>
            <span style={{ fontWeight: 600 }}>头像预览</span>
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                overflow: "hidden",
                border: "1px solid var(--border)",
                background: "rgba(255,255,255,0.9)",
                display: "grid",
                placeItems: "center",
                fontWeight: 800,
                fontSize: "1.4rem",
              }}
            >
              {avatarPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarPreview}
                  alt={namePreview || user?.email || "头像预览"}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <span>{(namePreview || user?.email || "演").slice(0, 1).toUpperCase()}</span>
              )}
            </div>
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <span style={{ fontWeight: 600 }}>账号邮箱</span>
            <div
              style={{
                ...inputStyle,
                color: "var(--muted)",
                display: "flex",
                alignItems: "center",
                minHeight: 50,
              }}
            >
              {profile?.email || user?.email || "暂无邮箱信息"}
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="submit"
              disabled={isSubmitting || isProfileLoading}
              style={{
                border: 0,
                padding: "14px 18px",
                borderRadius: 999,
                background: "var(--primary)",
                color: "var(--primary-foreground)",
                fontWeight: 700,
                opacity: isSubmitting || isProfileLoading ? 0.8 : 1,
              }}
            >
              {isSubmitting ? "保存中..." : "保存资料"}
            </button>
          </div>
        </form>
      </section>
    </section>
  );
}

const inputStyle = {
  width: "100%",
  borderRadius: 16,
  border: "1px solid var(--border)",
  padding: "14px 16px",
  background: "rgba(255,255,255,0.9)",
} satisfies CSSProperties;
