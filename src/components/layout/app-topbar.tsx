"use client";

import { useRouter } from "next/navigation";

import { useAuth } from "@/providers/auth-provider";

export function AppTopbar() {
  const router = useRouter();
  const { user, profile, isConfigured, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <header
      className="card-surface dashboard-topbar"
      style={{
        borderRadius: 28,
        padding: "18px 22px",
        background: "linear-gradient(180deg, rgba(255,255,255,0.92), rgba(244,248,255,0.84))",
      }}
    >
      <div className="dashboard-topbar__meta">
        <p className="section-eyebrow" style={{ margin: 0, color: "var(--primary)", fontWeight: 700, fontSize: "0.8rem" }}>
          {isConfigured ? "Appwrite 已连接" : "本地演示模式"}
        </p>
        <p style={{ margin: "8px 0 0", fontWeight: 600, lineHeight: 1.78, color: "var(--muted-strong)" }}>
          {isConfigured ? "登录状态与任务数据由 Appwrite 支持。" : "配置环境变量后，即可从本地演示切换到真实数据。"}
        </p>
      </div>
      <div className="dashboard-topbar__actions">
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            overflow: "hidden",
            border: "1px solid var(--border-strong)",
            background: "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(237,245,255,0.88))",
            display: "grid",
            placeItems: "center",
            fontWeight: 800,
          }}
        >
          {profile?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatarUrl}
              alt={profile.fullName || user?.email || "头像"}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <span>{(profile?.fullName || user?.email || "演").slice(0, 1).toUpperCase()}</span>
          )}
        </div>
        <div
          className="dashboard-topbar__profile ui-sans"
          style={{
            padding: "12px 14px",
            borderRadius: 20,
            background: "rgba(255,255,255,0.86)",
            border: "1px solid var(--border)",
            fontWeight: 700,
          }}
          title={profile?.fullName || user?.email || "演示用户"}
        >
          {profile?.fullName || user?.email || "演示用户"}
        </div>
        {isConfigured && user ? (
          <button
            type="button"
            onClick={handleSignOut}
            className="ui-sans"
            style={{
              border: "1px solid var(--border)",
              background: "rgba(255,255,255,0.86)",
              padding: "12px 16px",
              borderRadius: 20,
              fontWeight: 700,
            }}
          >
            退出登录
          </button>
        ) : null}
      </div>
    </header>
  );
}
