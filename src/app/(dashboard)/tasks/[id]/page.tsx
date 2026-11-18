import { TaskDetailClient } from "@/features/tasks/components/task-detail-client";
import { parseTaskEvolutionTarget } from "@/features/tasks/utils/task-evolution-navigation";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "任务详情" };

type TaskDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function TaskDetailPage({ params, searchParams }: TaskDetailPageProps) {
  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const value = (key: string) =>
    typeof resolvedSearchParams?.[key] === "string" ? (resolvedSearchParams[key] as string) : undefined;
  return (
    <TaskDetailClient
      id={id}
      initiallyEditing={value("edit") === "true"}
      evolutionTarget={parseTaskEvolutionTarget({ get: (key) => value(key) ?? null })}
    />
  );
}
