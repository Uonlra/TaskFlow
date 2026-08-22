import "@/styles/stats.css";

import { PageContainer } from "@/shared/components/layout/page-container";
import { PageHeader } from "@/shared/components/layout/page-header";
import { StatsClient } from "@/features/stats/components/stats-client";
import type { Metadata } from "next";
import { DASHBOARD_RANGE_VALUES } from "@/shared/lib/constants/query-params";

const showStatsPageHeader = true;

export const metadata: Metadata = { title: "统计" };

type StatsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function StatsPage({ searchParams }: StatsPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const initialRange = parseStatsRange(
    typeof resolvedSearchParams?.range === "string" ? resolvedSearchParams.range : undefined,
  );

  return (
    <PageContainer>
      {showStatsPageHeader ? <PageHeader eyebrow="统计" title="看清任务运行状态" /> : null}
      <StatsClient initialRange={initialRange} />
    </PageContainer>
  );
}

function parseStatsRange(value: string | undefined) {
  if (value === DASHBOARD_RANGE_VALUES.today || value === DASHBOARD_RANGE_VALUES.all) {
    return value;
  }

  return DASHBOARD_RANGE_VALUES.week;
}
