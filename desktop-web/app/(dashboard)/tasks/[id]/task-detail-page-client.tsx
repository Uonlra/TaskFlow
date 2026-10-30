"use client";

import "@/styles/task-detail.css";

import { Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { TaskDetailClient } from "@/features/tasks/components/task-detail-client";

export function TaskDetailPageClient({ fallbackId }: { fallbackId: string }) {
  return (
    <Suspense fallback={<p>正在加载任务详情...</p>}>
      <TaskDetailPageContent fallbackId={fallbackId} />
    </Suspense>
  );
}

function TaskDetailPageContent({ fallbackId }: { fallbackId: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pathId = pathname.split("/").filter(Boolean).at(-1);
  const id = pathId && pathId !== "__task__" ? pathId : fallbackId;

  return <TaskDetailClient id={id} initiallyEditing={searchParams.get("edit") === "true"} />;
}
