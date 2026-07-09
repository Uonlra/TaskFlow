import { TaskListClient } from "@/components/task/task-list-client";
import { PageContainer } from "@/components/layout/page-container";
import { DASHBOARD_RANGE_VALUES, TASK_DUE_FILTERS, TASK_RISK_FILTERS } from "@/lib/constants/query-params";

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
    date: parseTaskDateParam(typeof resolvedSearchParams?.date === "string" ? resolvedSearchParams.date : undefined),
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
      <TaskListClient initialFilters={initialFilters} />
    </PageContainer>
  );
}



function parseTaskDateParam(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return "";
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime()) || formatDateParam(date) !== value) {
    return "";
  }

  return value;
}

function formatDateParam(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const date = String(value.getDate()).padStart(2, "0");

  return `${year}-${month}-${date}`;
}
