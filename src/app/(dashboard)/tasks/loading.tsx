import { TaskPageSkeleton } from "@/features/tasks/components/task-page-skeleton";
import { PageContainer } from "@/shared/components/layout/page-container";

export default function TasksLoading() {
  return (
    <PageContainer>
      <TaskPageSkeleton />
    </PageContainer>
  );
}
