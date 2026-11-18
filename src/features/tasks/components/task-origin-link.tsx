import { TaskRelationLink } from "./task-relation-link";
import { GitBranch } from "lucide-react";
import type { TaskEvolution } from "@/features/tasks/types/task-evolution.types";
import { taskOriginHref } from "@/features/tasks/utils/task-transfer-navigation";

export function TaskOriginLink({ evolution }: { evolution?: TaskEvolution }) {
  if (!evolution?.origin) return null;
  const href = taskOriginHref(evolution);
  const name = `${evolution.origin.taskTitle} / ${evolution.origin.branchTitle}`;
  return (
    <div className="task-evolution-origin">
      <GitBranch size={14} aria-hidden="true" />
      <span>{href ? "来源" : "备份来源"}</span>
      {href ? (
        <TaskRelationLink taskId={evolution.origin.taskId} href={href} title={name}>
          {name}
        </TaskRelationLink>
      ) : (
        <span>{name}</span>
      )}
    </div>
  );
}
