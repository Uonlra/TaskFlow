import { TaskListClient } from "@/components/task/task-list-client";
import { PageContainer } from "@/components/layout/page-container";
import { TASK_DUE_FILTERS, TASK_RISK_FILTERS } from "@/lib/constants/query-params";

type TasksPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function TasksPage({ searchParams }: TasksPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const initialFilters = {
    query: typeof resolvedSearchParams?.query === "string" ? resolvedSearchParams.query : "",
    tag: typeof resolvedSearchParams?.tag === "string" ? resolvedSearchParams.tag : "",
    status:
      resolvedSearchParams?.status === "todo" ||
      resolvedSearchParams?.status === "in_progress" ||
      resolvedSearchParams?.status === "done"
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
      <TaskListClient initialFilters={initialFilters} />
    </PageContainer>
  );
}

