import "@/styles/task-components.css";
import "@/styles/dashboard-overview.css";
import "@/styles/dashboard-empty.css";
import "@/styles/dashboard-mobile.css";

import { DashboardClient } from "@/features/dashboard/components/dashboard-client";
import { PageContainer } from "@/shared/components/layout/page-container";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "总览" };

type DashboardPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const rangeValue = resolvedSearchParams?.range;
  const initialRange = rangeValue === "week" || rangeValue === "all" ? rangeValue : "today";

  return (
    <PageContainer>
      <DashboardClient initialRange={initialRange} />
    </PageContainer>
  );
}
