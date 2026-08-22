import "@/styles/auth-action-gate.css";
import "@/styles/dashboard.css";
import "@/styles/data-empty-state.css";
import "@/styles/workspace-state.css";

import type { ReactNode } from "react";
import type { Metadata } from "next";

import { DashboardShell } from "@/shared/components/layout/dashboard-shell";

type DashboardLayoutProps = {
  children: ReactNode;
};

export const metadata: Metadata = {
  title: {
    default: "Personal workspace",
    template: "U's Task | %s",
  },
};

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return <DashboardShell>{children}</DashboardShell>;
}
