import { TaskDetailPageClient } from "./task-detail-page-client";

export function generateStaticParams() {
  return [{ id: "__task__" }];
}

export default async function DesktopTaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TaskDetailPageClient fallbackId={id} />;
}
