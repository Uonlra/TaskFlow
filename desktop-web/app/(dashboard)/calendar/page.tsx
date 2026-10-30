"use client";

import "@/styles/task-components.css";
import "@/styles/calendar.css";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { CalendarClient } from "@/features/calendar/components/calendar-client";
import { PageContainer } from "@/shared/components/layout/page-container";
import { DASHBOARD_RANGE_VALUES } from "@/shared/lib/constants/query-params";

export default function DesktopCalendarPage() {
  return (
    <PageContainer>
      <Suspense fallback={<p>正在加载日历...</p>}>
        <CalendarClientFromUrl />
      </Suspense>
    </PageContainer>
  );
}

function CalendarClientFromUrl() {
  const searchParams = useSearchParams();
  const date = searchParams.get("date");
  const initialDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : formatDateParam(new Date());
  const range = searchParams.get("range");
  const initialRange = range === DASHBOARD_RANGE_VALUES.today || range === DASHBOARD_RANGE_VALUES.all ? range : "week";
  return <CalendarClient initialDate={initialDate} initialRange={initialRange} />;
}

function formatDateParam(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}
