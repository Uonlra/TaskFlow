import "@/styles/auth-action-gate.css";
import "@/styles/dashboard-shell.css";
import "@/styles/data-empty-state.css";
import "@/styles/workspace-state.css";

import type { ReactNode } from "react";

import { DashboardShell } from "@/shared/components/layout/dashboard-shell";

export default function DesktopDashboardLayout({ children }: { children: ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
