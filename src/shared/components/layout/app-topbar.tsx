"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/features/auth/providers/auth-provider";

type AppTopbarProps = {
  variant?: "desktop" | "mobile";
};

export function AppTopbar({ variant = "desktop" }: AppTopbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, isAuthenticated, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);
  const loginHref = `/login?next=${encodeURIComponent(pathname)}`;

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };
  const displayName = profile?.fullName || user?.email || "访客";
  const avatarContent = profile?.avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={profile.avatarUrl} alt={displayName || "头像"} />
  ) : (
    <span>{(displayName || "访").slice(0, 1).toUpperCase()}</span>
  );

  useEffect(() => {
    if (variant !== "mobile" || !mobileMenuOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!mobileMenuRef.current?.contains(event.target as Node)) setMobileMenuOpen(false);
    };
    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [mobileMenuOpen, variant]);

  return (
    <header className={variant === "mobile" ? "dashboard-topbar dashboard-topbar--mobile" : "dashboard-topbar"}>
      <div className="dashboard-topbar__meta">
        <p className="dashboard-topbar__status">{isAuthenticated ? "账号已连接" : "访客浏览"}</p>
        <p className="dashboard-topbar__description">{isAuthenticated ? "账号和任务将安全同步。" : "登录后即可管理和同步你的真实任务。"}</p>
      </div>
      <div className="dashboard-topbar__actions">
        {variant === "mobile" && isAuthenticated ? (
          <div className="dashboard-avatar-menu" ref={mobileMenuRef}>
            <button type="button" className="dashboard-avatar dashboard-avatar-button" aria-label="打开账号菜单" aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen((current) => !current)}>
              {avatarContent}
            </button>
            {mobileMenuOpen ? (
              <div className="dashboard-avatar-menu__panel" role="menu">
                <p className="dashboard-avatar-menu__name">{displayName}</p>
                <button type="button" role="menuitem" onClick={handleSignOut}>退出登录</button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="dashboard-avatar">{avatarContent}</div>
        )}
        <div className="dashboard-topbar__profile" title={displayName}>{displayName}</div>
        {isAuthenticated ? (
          <button type="button" onClick={handleSignOut} className="dashboard-signout-button">退出登录</button>
        ) : (
          <a href={loginHref} className="dashboard-signout-button" data-auth-gate-bypass>登录</a>
        )}
      </div>
    </header>
  );
}
