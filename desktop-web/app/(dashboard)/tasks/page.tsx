"use client";

import "@/styles/task-components.css";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { TaskListClient } from "@/features/tasks/components/task-list-client";
import { PageContainer } from "@/shared/components/layout/page-container";
import { parseTaskFiltersFromParams } from "@/features/tasks/utils/task-list-query";

export default function DesktopTasksPage() {
  return (
    <PageContainer>
      <Suspense fallback={<p>正在加载任务...</p>}>
        <TaskListClientFromUrl />
      </Suspense>
    </PageContainer>
  );
}

function TaskListClientFromUrl() {
  const searchParams = useSearchParams();
  return <TaskListClient initialFilters={parseTaskFiltersFromParams(searchParams)} initialData={null} />;
}
