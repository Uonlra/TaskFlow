"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/providers/auth-provider";

type AppTopbarProps = {
  variant?: "desktop" | "mobile";
};

export function AppTopbar({ variant = "desktop" }: AppTopbarProps) {
  const router = useRouter();
  const { user, profile, isConfigured, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);

  const handleSignOut = async (redirectTo = "/login") => {
    await signOut();
    router.push(redirectTo);
  };
  const handleSwitchAccount = async () => {
    await handleSignOut("/login");
  };
  const statusLabel = isConfigured ? "Appwrite 已连接" : "本地演示模式";
  const description = isConfigured
    ? "登录状态与任务数据由 Appwrite 支持。"
    : "配置环境变量后，即可从本地演示切换到真实数据。";
  const displayName = profile?.fullName || user?.email || "演示用户";
  const avatarContent = profile?.avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={profile.avatarUrl}
      alt={displayName || "头像"}
    />
  ) : (
    <span>{(displayName || "演").slice(0, 1).toUpperCase()}</span>
  );

  useEffect(() => {
    if (variant !== "mobile" || !mobileMenuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!mobileMenuRef.current?.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [mobileMenuOpen, variant]);

  return (
    <header className={variant === "mobile" ? "dashboard-topbar dashboard-topbar--mobile" : "dashboard-topbar"}>
      <div className="dashboard-topbar__meta">
        <p className="dashboard-topbar__status">
          {statusLabel}
        </p>
        <p className="dashboard-topbar__description">
          {description}
        </p>
      </div>
      <div className="dashboard-topbar__actions">
        {variant === "mobile" ? (
          <div className="dashboard-avatar-menu" ref={mobileMenuRef}>
            <button
              type="button"
              className="dashboard-avatar dashboard-avatar-button"
              aria-label="打开账号菜单"
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((current) => !current)}
            >
              {avatarContent}
            </button>
            {mobileMenuOpen ? (
              <div className="dashboard-avatar-menu__panel" role="menu">
                <p className="dashboard-avatar-menu__name">{displayName}</p>
                <button type="button" role="menuitem" onClick={handleSwitchAccount}>
                  切换账号
                </button>
                {isConfigured && user ? (
                  <button type="button" role="menuitem" onClick={() => handleSignOut()}>
                    退出登录
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="dashboard-avatar">
            {avatarContent}
          </div>
        )}
        <div
          className="dashboard-topbar__profile"
          title={displayName}
        >
          {displayName}
        </div>
        {isConfigured && user ? (
          <button
            type="button"
            onClick={() => handleSignOut()}
            className="dashboard-signout-button"
          >
            退出登录
          </button>
        ) : null}
      </div>
    </header>
  );
}
