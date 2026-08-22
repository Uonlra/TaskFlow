"use client";

import { useEffect, useState, type ReactNode } from "react";

import { AuthActionGateProvider } from "@/features/auth/components/auth-action-gate";
import { AppSidebar } from "@/shared/components/layout/app-sidebar";
import { MobileBottomNavigation } from "@/shared/components/layout/mobile-bottom-navigation";

type DashboardShellProps = {
  children: ReactNode;
};

const SIDEBAR_COLLAPSED_STORAGE_KEY = "taskflow.sidebar.collapsed";

export function DashboardShell({ children }: DashboardShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    try {
      setSidebarCollapsed(window.localStorage?.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === "true");
    } catch {
      // Storage can be unavailable in private browsing and test environments.
    }
  }, []);

  const toggleSidebar = () => {
    setSidebarCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage?.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(next));
      } catch {
        // The visual toggle remains usable when storage is unavailable.
      }
      return next;
    });
  };

  return (
    <AuthActionGateProvider>
      <div
        className={
          sidebarCollapsed
            ? "app-shell dashboard-shell dashboard-shell--sidebar-collapsed"
            : "app-shell dashboard-shell"
        }
      >
        <a className="dashboard-skip-link" href="#main-content">
          跳到主要内容
        </a>
        <AppSidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
        <div className="dashboard-main">
          <main id="main-content" tabIndex={-1} className="dashboard-content">
            {children}
          </main>
        </div>
        <MobileBottomNavigation />
      </div>
    </AuthActionGateProvider>
  );
}
