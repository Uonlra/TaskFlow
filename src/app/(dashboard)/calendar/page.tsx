import "@/styles/calendar.css";

import { CalendarClient } from "@/features/calendar/components/calendar-client";
import { PageContainer } from "@/shared/components/layout/page-container";
import { PageHeader } from "@/shared/components/layout/page-header";
import { DASHBOARD_RANGE_VALUES, type DashboardRangeValue } from "@/shared/lib/constants/query-params";

const showCalendarPageHeader = true;

type CalendarPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CalendarPage({ searchParams }: CalendarPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const initialDate = parseCalendarDate(
    typeof resolvedSearchParams?.date === "string" ? resolvedSearchParams.date : undefined,
  );
  const initialRange = parseCalendarRange(
    typeof resolvedSearchParams?.range === "string" ? resolvedSearchParams.range : undefined,
  );

  return (
    <PageContainer>
      {showCalendarPageHeader ? (
        <PageHeader
          eyebrow="日历"
          title="按日期查看任务"
          description="截止、重点和近期风险集中在这里，保持日程清楚可扫。"
        />
      ) : null}
      <CalendarClient initialDate={initialDate} initialRange={initialRange} />
    </PageContainer>
  );
}

function parseCalendarRange(value: string | undefined): DashboardRangeValue {
  if (value === DASHBOARD_RANGE_VALUES.today || value === DASHBOARD_RANGE_VALUES.all) {
    return value;
  }

  return DASHBOARD_RANGE_VALUES.week;
}

function parseCalendarDate(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return formatDateParam(new Date());
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime()) || formatDateParam(date) !== value) {
    return formatDateParam(new Date());
  }

  return value;
}

function formatDateParam(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const date = String(value.getDate()).padStart(2, "0");

  return `${year}-${month}-${date}`;
}
