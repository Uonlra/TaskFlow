import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";

type DashboardPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const rangeValue = resolvedSearchParams?.range;
  const initialRange = rangeValue === "week" || rangeValue === "all" ? rangeValue : "today";

  return (
    <PageContainer>
      <PageHeader
        eyebrow="概览"
        title="把当前节奏看得更清楚"
        description="从任务状态、到期提醒和最近活动里快速判断今天该先做什么。"
      />
      <DashboardClient initialRange={initialRange} />
    </PageContainer>
  );
}
