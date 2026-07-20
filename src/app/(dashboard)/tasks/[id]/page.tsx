import { TaskDetailClient } from "@/features/tasks/components/task-detail-client";

type TaskDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function TaskDetailPage({ params }: TaskDetailPageProps) {
  const { id } = await params;
  return <TaskDetailClient id={id} />;
}
