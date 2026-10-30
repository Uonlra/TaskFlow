"use client";

import "@/styles/stats.css";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { StatsClient } from "@/features/stats/components/stats-client";
import { PageContainer } from "@/shared/components/layout/page-container";

export default function DesktopStatsPage() {
  return (
    <PageContainer>
      <Suspense fallback={<p>正在加载统计...</p>}>
        <StatsClientFromUrl />
      </Suspense>
    </PageContainer>
  );
}

function StatsClientFromUrl() {
  const range = useSearchParams().get("range");
  return <StatsClient initialRange={range === "today" || range === "all" ? range : "week"} />;
}
