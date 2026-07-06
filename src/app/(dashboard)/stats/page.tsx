import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { StatsClient } from "@/components/stats/stats-client";
import { DASHBOARD_RANGE_VALUES } from "@/lib/constants/query-params";

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
      <PageHeader
        eyebrow="统计"
        title="看清任务运行状态"
        description="趋势、分布、标签和风险集中在这里，方便从全局判断任务节奏。"
      />
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
