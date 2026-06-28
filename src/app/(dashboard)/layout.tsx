import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { hasAppwriteEnv } from "@/lib/appwrite/env";
import { getCurrentAuthEnvelope } from "@/lib/appwrite/server";
import { DashboardShell } from "@/components/layout/dashboard-shell";

type DashboardLayoutProps = {
  children: ReactNode;
};

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  if (hasAppwriteEnv) {
    const auth = await getCurrentAuthEnvelope();

    if (!auth?.user) {
      redirect("/login");
    }
  }

  return (
    <DashboardShell>{children}</DashboardShell>
  );
}
