"use client";

import type { CSSProperties } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";

import type { ProfileFormValues } from "@/features/auth/types/profile.types";
import { useAuth } from "@/providers/auth-provider";
import { useToast } from "@/providers/toast-provider";

export function SettingsClient() {
  const router = useRouter();
  const { profile, user, isConfigured, isProfileLoading, saveProfile, signOut } = useAuth();
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
  const handleSignOut = async () => {
    await signOut();
    showToast({
      title: "已退出登录",
      description: "当前会话已结束，可以换个账号继续。",
      tone: "success",
    });
    router.push("/login");
  };

  return (
    <section style={{ display: "grid", gap: 24 }}>
      {!isConfigured ? (
        <section className="card-surface" style={{ borderRadius: 28, padding: 24 }}>
          <p style={{ margin: 0, color: "var(--muted-strong)", lineHeight: 1.76 }}>
            当前还没有连接 Appwrite，所以这里的资料修改只会影响本地演示会话。
          </p>
        </section>
      ) : null}

      <section className="settings-grid">
        <aside
          className="card-surface dashboard-highlight-card"
          style={{
            borderRadius: 28,
            padding: 24,
            background: "linear-gradient(180deg, rgba(255,255,255,0.92), rgba(237,245,255,0.86))",
            display: "grid",
            gap: 18,
            alignContent: "start",
          }}
        >
          <div>
            <p className="section-eyebrow" style={{ margin: 0, color: "var(--primary)", fontWeight: 700, fontSize: "0.82rem" }}>
              Profile
            </p>
            <h2 style={{ margin: "12px 0 0", fontSize: "1.5rem" }}>工作台身份卡</h2>
            <p style={{ margin: "12px 0 0", color: "var(--muted-strong)", lineHeight: 1.82 }}>
              这里会影响顶部头像、用户昵称和整个工作台里的身份展示方式。
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gap: 14,
              padding: 18,
              borderRadius: 24,
              border: "1px solid var(--border)",
              background: "rgba(255,255,255,0.86)",
            }}
          >
            <div
              style={{
                width: 84,
                height: 84,
                borderRadius: "50%",
                overflow: "hidden",
                border: "1px solid var(--border-strong)",
                background: "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(237,245,255,0.9))",
                display: "grid",
                placeItems: "center",
                fontWeight: 800,
                fontSize: "1.6rem",
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
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: "1.12rem" }}>{namePreview || "未设置姓名"}</p>
              <p className="ui-sans" style={{ margin: "6px 0 0", color: "var(--muted)" }}>
                {profile?.email || user?.email || "暂无邮箱信息"}
              </p>
            </div>
          </div>
        </aside>

        <section
          className="card-surface"
          style={{
            borderRadius: 28,
            padding: 24,
            background: "linear-gradient(180deg, rgba(255,255,255,0.92), rgba(249,251,255,0.84))",
          }}
        >
          <div style={{ display: "grid", gap: 8 }}>
            <p className="section-eyebrow" style={{ margin: 0, color: "var(--data-ink)", fontWeight: 700, fontSize: "0.82rem" }}>
              Account Settings
            </p>
            <h2 style={{ margin: 0, fontSize: "1.28rem" }}>工作台身份信息</h2>
            <p style={{ margin: 0, color: "var(--muted-strong)", lineHeight: 1.74 }}>
              调整会在顶栏、设置页和其他区域展示的姓名与头像地址。
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} style={{ display: "grid", gap: 16, marginTop: 24 }}>
            <label style={{ display: "grid", gap: 8 }}>
              <span className="ui-sans" style={{ fontWeight: 600 }}>姓名</span>
              <input
                {...register("fullName")}
                placeholder="请输入你的姓名或常用称呼"
                style={inputStyle}
                disabled={isProfileLoading}
              />
            </label>

            <label style={{ display: "grid", gap: 8 }}>
              <span className="ui-sans" style={{ fontWeight: 600 }}>头像地址</span>
              <input
                {...register("avatarUrl")}
                placeholder="https://example.com/avatar.jpg"
                style={inputStyle}
                disabled={isProfileLoading}
              />
            </label>

            <div style={{ display: "grid", gap: 6 }}>
              <span className="ui-sans" style={{ fontWeight: 600 }}>账号邮箱</span>
              <div
                className="ui-sans"
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
                className="ui-sans"
                style={{
                  border: "1px solid transparent",
                  padding: "14px 18px",
                  borderRadius: 999,
                  background: "linear-gradient(135deg, var(--primary), var(--data-cyan))",
                  color: "var(--primary-foreground)",
                  fontWeight: 700,
                  opacity: isSubmitting || isProfileLoading ? 0.8 : 1,
                  boxShadow: "0 12px 24px rgba(37,99,235,0.18)",
                }}
              >
                {isSubmitting ? "保存中..." : "保存资料"}
              </button>
            </div>
          </form>

          <section className="settings-danger-zone">
            <div>
              <p className="settings-danger-zone__title">退出当前账号</p>
              <p className="settings-danger-zone__description">
                结束当前会话并返回登录页。下次进入真实数据前，需要重新登录。
              </p>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="settings-signout-button"
            >
              退出登录
            </button>
          </section>
        </section>
      </section>
    </section>
  );
}

const inputStyle = {
  width: "100%",
  borderRadius: 16,
  border: "1px solid var(--border)",
  padding: "14px 16px",
  background: "rgba(255,255,255,0.92)",
} satisfies CSSProperties;
