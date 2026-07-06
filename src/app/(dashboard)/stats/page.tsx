import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { StatsClient } from "@/components/stats/stats-client";

export default function StatsPage() {
  return (
    <PageContainer>
      <PageHeader
        eyebrow="统计"
        title="看清任务运行状态"
        description="先承接趋势、分布、标签和风险的数据结构，后续再接 ECharts。"
      />
      <StatsClient />
    </PageContainer>
  );
}
