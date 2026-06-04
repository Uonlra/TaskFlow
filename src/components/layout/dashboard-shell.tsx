import type { ReactNode } from "react";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppTopbar } from "@/components/layout/app-topbar";

type DashboardShellProps = {
  children: ReactNode;
};

export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <div className="app-shell dashboard-shell">
      <AppSidebar />
      <div style={{ minWidth: 0 }}>
        <AppTopbar />
        <main style={{ marginTop: 20 }}>{children}</main>
      </div>
    </div>
  );
}
