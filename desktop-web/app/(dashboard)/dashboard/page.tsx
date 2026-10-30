"use client";

import "@/styles/task-components.css";
import "@/styles/dashboard-overview.css";
import "@/styles/dashboard-empty.css";
import "@/styles/dashboard-mobile.css";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { DashboardClient } from "@/features/dashboard/components/dashboard-client";
import { PageContainer } from "@/shared/components/layout/page-container";

export default function DesktopDashboardPage() {
  return (
    <PageContainer>
      <Suspense fallback={<p>正在加载总览...</p>}>
        <DashboardClientFromUrl />
      </Suspense>
    </PageContainer>
  );
}

function DashboardClientFromUrl() {
  const range = useSearchParams().get("range");
  return <DashboardClient initialRange={range === "week" || range === "all" ? range : "today"} />;
}
