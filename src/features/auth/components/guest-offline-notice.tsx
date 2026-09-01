"use client";

import { CloudOff, LogIn } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAuth } from "@/features/auth/providers/auth-provider";

const guestWorkspaceRoutes = ["/dashboard", "/tasks", "/calendar", "/stats"];

export function GuestOfflineNotice() {
  const pathname = usePathname();
  const { user, isLoading } = useAuth();

  if (isLoading || user || !isGuestWorkspaceRoute(pathname)) {
    return null;
  }

  const loginHref = `/login?next=${encodeURIComponent(pathname)}`;

  return (
    <div className="guest-offline-notice" role="status" aria-label="访客数据保存状态">
      <div className="guest-offline-notice__message">
        <span className="guest-offline-notice__icon" aria-hidden="true">
          <CloudOff size={17} strokeWidth={1.8} />
        </span>
        <p>
          <strong>离线访客模式</strong>
          <span>数据临时保存在当前浏览器，关闭后将无法恢复。</span>
        </p>
      </div>
      <Link className="guest-offline-notice__action" href={loginHref}>
        <LogIn size={16} strokeWidth={1.8} aria-hidden="true" />
        登录并同步
      </Link>
    </div>
  );
}

function isGuestWorkspaceRoute(pathname: string) {
  return guestWorkspaceRoutes.some(
    (route) => pathname === route || (route === "/tasks" && pathname.startsWith(`${route}/`)),
  );
}
