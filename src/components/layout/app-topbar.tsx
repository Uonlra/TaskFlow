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
    <header className="dashboard-topbar">
      <div className="dashboard-topbar__meta">
        <p className="dashboard-topbar__status">
          {isConfigured ? "Appwrite 已连接" : "本地演示模式"}
        </p>
        <p className="dashboard-topbar__description">
          {isConfigured ? "登录状态与任务数据由 Appwrite 支持。" : "配置环境变量后，即可从本地演示切换到真实数据。"}
        </p>
      </div>
      <div className="dashboard-topbar__actions">
        <div className="dashboard-avatar">
          {profile?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatarUrl}
              alt={profile.fullName || user?.email || "头像"}
            />
          ) : (
            <span>{(profile?.fullName || user?.email || "演").slice(0, 1).toUpperCase()}</span>
          )}
        </div>
        <div
          className="dashboard-topbar__profile"
          title={profile?.fullName || user?.email || "演示用户"}
        >
          {profile?.fullName || user?.email || "演示用户"}
        </div>
        {isConfigured && user ? (
          <button
            type="button"
            onClick={handleSignOut}
            className="dashboard-signout-button"
          >
            退出登录
          </button>
        ) : null}
      </div>
    </header>
  );
}
