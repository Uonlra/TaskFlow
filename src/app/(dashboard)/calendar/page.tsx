import { CalendarClient } from "@/components/calendar/calendar-client";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";

export default function CalendarPage() {
  return (
    <PageContainer>
      <PageHeader
        eyebrow="日历"
        title="把截止日期摊开看"
        description="先建立日期、截止和时间线的页面骨架，后续再接完整日历视图。"
      />
      <CalendarClient />
    </PageContainer>
  );
}
