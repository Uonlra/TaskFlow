import { TaskListClient } from "@/features/tasks/components/task-list-client";
import type { Metadata } from "next";
import { getTaskPageInitialData } from "@/features/tasks/server/get-task-page-initial-data";
import { PageContainer } from "@/shared/components/layout/page-container";
import { parseTaskFiltersFromParams } from "@/features/tasks/utils/task-list-query";

export const metadata: Metadata = { title: "任务" };

type TasksPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function TasksPage({ searchParams }: TasksPageProps) {
  const resolvedSearchParams = await (searchParams ?? Promise.resolve(undefined));
  const params = new URLSearchParams();
  Object.entries(resolvedSearchParams ?? {}).forEach(([key, value]) => {
    if (typeof value === "string") params.set(key, value);
  });
  const initialFilters = parseTaskFiltersFromParams(params);

  const initialData = await getTaskPageInitialData(
    initialFilters,
    typeof resolvedSearchParams?.page === "string" ? resolvedSearchParams.page : undefined,
  );

  return (
    <PageContainer>
      <TaskListClient initialFilters={initialFilters} initialData={initialData} />
    </PageContainer>
  );
}
