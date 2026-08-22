import { TaskListClient } from "@/features/tasks/components/task-list-client";
import type { Metadata } from "next";
import { getTaskPageInitialData } from "@/features/tasks/server/get-task-page-initial-data";
import { formatTaskDateParam, parseTaskDateParam } from "@/features/tasks/utils/task-date-filters";
import { PageContainer } from "@/shared/components/layout/page-container";
import { DASHBOARD_RANGE_VALUES, TASK_DUE_FILTERS, TASK_RISK_FILTERS } from "@/shared/lib/constants/query-params";

export const metadata: Metadata = { title: "任务" };

type TasksPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function TasksPage({ searchParams }: TasksPageProps) {
  const [resolvedSearchParams, initialData] = await Promise.all([
    searchParams ?? Promise.resolve(undefined),
    getTaskPageInitialData(),
  ]);
  const parsedDate = parseTaskDateParam(
    typeof resolvedSearchParams?.date === "string" ? resolvedSearchParams.date : undefined,
  );
  const initialFilters = {
    query: typeof resolvedSearchParams?.query === "string" ? resolvedSearchParams.query : "",
    tag: typeof resolvedSearchParams?.tag === "string" ? resolvedSearchParams.tag : "",
    status:
      resolvedSearchParams?.status === "todo" ||
      resolvedSearchParams?.status === "in_progress" ||
      resolvedSearchParams?.status === "done" ||
      resolvedSearchParams?.status === "active"
        ? resolvedSearchParams.status
        : "all",
    priority:
      resolvedSearchParams?.priority === "low" ||
      resolvedSearchParams?.priority === "medium" ||
      resolvedSearchParams?.priority === "high"
        ? resolvedSearchParams.priority
        : "all",
    due:
      resolvedSearchParams?.due === TASK_DUE_FILTERS.near ||
      resolvedSearchParams?.due === TASK_DUE_FILTERS.today ||
      resolvedSearchParams?.due === TASK_DUE_FILTERS.upcoming ||
      resolvedSearchParams?.due === TASK_DUE_FILTERS.overdue
        ? resolvedSearchParams.due
        : "",
    risk:
      resolvedSearchParams?.risk === TASK_RISK_FILTERS.overdue ||
      resolvedSearchParams?.risk === TASK_RISK_FILTERS.high ||
      resolvedSearchParams?.risk === TASK_RISK_FILTERS.medium ||
      resolvedSearchParams?.risk === TASK_RISK_FILTERS.low
        ? resolvedSearchParams.risk
        : "",
    date: parsedDate ? formatTaskDateParam(parsedDate) : "",
    range:
      resolvedSearchParams?.range === DASHBOARD_RANGE_VALUES.today ||
      resolvedSearchParams?.range === DASHBOARD_RANGE_VALUES.week ||
      resolvedSearchParams?.range === DASHBOARD_RANGE_VALUES.all
        ? resolvedSearchParams.range
        : "",
    sort:
      resolvedSearchParams?.sort === "created_desc" ||
      resolvedSearchParams?.sort === "updated_desc" ||
      resolvedSearchParams?.sort === "priority_desc" ||
      resolvedSearchParams?.sort === "due_asc"
        ? resolvedSearchParams.sort
        : "due_asc",
  } as const;

  return (
    <PageContainer>
      <TaskListClient initialFilters={initialFilters} initialData={initialData} />
    </PageContainer>
  );
}
