"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

import { useAuth } from "@/features/auth/providers/auth-provider";

export function AuthActionGateProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const gateRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [intent, setIntent] = useState("管理你的任务");
  const [returnTo, setReturnTo] = useState(pathname);
  const encodedReturnTo = encodeURIComponent(returnTo);

  const requireAuth = useCallback(
    (nextIntent = "管理你的任务") => {
      if (isAuthenticated) return true;
      setIntent(nextIntent);
      setReturnTo(typeof window === "undefined" ? pathname : `${window.location.pathname}${window.location.search}`);
      setIsOpen(true);
      return false;
    },
    [isAuthenticated, pathname],
  );

  const handleClickCapture = useCallback(
    (event: MouseEvent) => {
      if (isAuthenticated) return;

      const target = event.target;
      if (!(target instanceof HTMLElement) || target.closest("[data-auth-gate-bypass]")) return;

      const link = target.closest("a[href]") as HTMLAnchorElement | null;
      if (link) {
        if (!link.closest("[data-auth-required]") || isBrowseNavigation(link.getAttribute("href"))) return;
        event.preventDefault();
        event.stopPropagation();
        requireAuth("使用此功能");
        return;
      }

      if (target.closest("[data-auth-required]")) {
        event.preventDefault();
        event.stopPropagation();
        requireAuth("使用此功能");
      }
    },
    [isAuthenticated, requireAuth],
  );

  const handleFocusCapture = useCallback(
    (event: FocusEvent) => {
      if (isAuthenticated) return;
      const target = event.target;
      if (
        !(target instanceof HTMLElement) ||
        target.closest("[data-auth-gate-bypass]") ||
        !target.closest("[data-auth-required]") ||
        !target.matches("input, select, textarea")
      )
        return;
      target.blur();
      requireAuth("使用此功能");
    },
    [isAuthenticated, requireAuth],
  );

  useEffect(() => {
    const gate = gateRef.current;
    if (!gate) return;

    gate.addEventListener("click", handleClickCapture, true);
    gate.addEventListener("focusin", handleFocusCapture, true);
    return () => {
      gate.removeEventListener("click", handleClickCapture, true);
      gate.removeEventListener("focusin", handleFocusCapture, true);
    };
  }, [handleClickCapture, handleFocusCapture]);

  return (
    <div ref={gateRef} className="auth-action-gate">
      {children}
      {isOpen ? (
        <div className="auth-action-gate__backdrop" role="presentation">
          <section
            className="auth-action-gate__dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-action-gate-title"
            data-auth-gate-bypass
          >
            <button
              type="button"
              className="auth-action-gate__close"
              aria-label="关闭登录提醒"
              onClick={() => setIsOpen(false)}
            >
              ×
            </button>
            <p>访客浏览</p>
            <h2 id="auth-action-gate-title">登录后即可{intent}</h2>
            <span>登录后会回到当前页面，继续刚才的操作。</span>
            <div>
              <Link href={`/login?next=${encodedReturnTo}`}>登录并继续</Link>
              <Link href={`/register?next=${encodedReturnTo}`} className="auth-action-gate__secondary">
                创建账号
              </Link>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function isBrowseNavigation(href: string | null) {
  if (!href || !href.startsWith("/")) return true;
  return (
    href === "/dashboard" ||
    href === "/tasks" ||
    href.startsWith("/tasks/") ||
    href === "/calendar" ||
    href === "/stats" ||
    href === "/settings"
  );
}
