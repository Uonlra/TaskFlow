import { TaskDetailClient } from "@/features/tasks/components/task-detail-client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "任务详情" };

type TaskDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function TaskDetailPage({ params }: TaskDetailPageProps) {
  const { id } = await params;
  return <TaskDetailClient id={id} />;
}
