import type { ReactNode } from "react";

import { AuthActionGateProvider } from "@/features/auth/components/auth-action-gate";
import { AppSidebar } from "@/shared/components/layout/app-sidebar";
import { AppTopbar } from "@/shared/components/layout/app-topbar";

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
      </div>
    </AuthActionGateProvider>
  );
}