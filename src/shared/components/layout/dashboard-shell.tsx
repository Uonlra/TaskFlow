import type { ReactNode } from "react";

import { AuthActionGateProvider } from "@/features/auth/components/auth-action-gate";
import { AppSidebar } from "@/shared/components/layout/app-sidebar";
import { AppTopbar } from "@/shared/components/layout/app-topbar";
import { MobileBottomNavigation } from "@/shared/components/layout/mobile-bottom-navigation";

type DashboardShellProps = {
  children: ReactNode;
};

export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <AuthActionGateProvider>
      <div className="app-shell dashboard-shell">
        <AppSidebar />
        <div className="dashboard-main">
          <AppTopbar />
          <main className="dashboard-content">{children}</main>
        </div>
        <MobileBottomNavigation />
      </div>
    </AuthActionGateProvider>
  );
}