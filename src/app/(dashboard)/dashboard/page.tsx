import { DashboardClient } from "@/features/dashboard/components/dashboard-client";
import { PageContainer } from "@/shared/components/layout/page-container";

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

