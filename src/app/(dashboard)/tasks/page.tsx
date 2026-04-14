import { TaskListClient } from "@/components/task/task-list-client";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";

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
      <PageHeader
        eyebrow="任务"
        title="把任务整理成清楚的工作队列"
        description="用搜索、标签、优先级和排序把工作收束成清晰列表，再决定今天先推进哪一项。"
      />
      <TaskListClient initialFilters={initialFilters} />
    </PageContainer>
  );
}
