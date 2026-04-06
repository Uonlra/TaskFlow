import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";

type DashboardLayoutProps = {
  children: ReactNode;
};

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  if (hasSupabaseEnv) {
    const supabase = await getSupabaseServerClient();

    if (supabase) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        redirect("/login");
      }
    }
  }

  return (
    <DashboardShell>{children}</DashboardShell>
  );
}
