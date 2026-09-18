"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/features/auth/providers/auth-provider";

export function AppTopbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, isAuthenticated, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
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
    if (!menuOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!mobileMenuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [menuOpen]);

  return (
    <div className="dashboard-sidebar-account" ref={mobileMenuRef}>
      <button
        type="button"
        className="dashboard-sidebar-account__trigger"
        aria-label="打开账号菜单"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((current) => !current)}
      >
        <span className="dashboard-avatar">{avatarContent}</span>
        <span className="dashboard-sidebar-account__copy">
          <strong title={displayName}>{displayName}</strong>
          <small>{isAuthenticated ? "账号已连接" : "访客工作区"}</small>
        </span>
      </button>
      {menuOpen ? (
        <div className="dashboard-avatar-menu__panel dashboard-sidebar-account__panel" role="menu">
          <p className="dashboard-avatar-menu__name">{displayName}</p>
          {isAuthenticated ? (
            <button type="button" role="menuitem" onClick={handleSignOut}>
              退出登录
            </button>
          ) : (
            <a href={loginHref} role="menuitem" data-auth-gate-bypass>
              登录
            </a>
          )}
        </div>
      ) : null}
    </div>
  );
}
