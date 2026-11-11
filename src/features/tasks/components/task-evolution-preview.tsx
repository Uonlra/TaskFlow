"use client";

import Link from "next/link";
import { ArrowUpRight, GitBranch } from "lucide-react";
import type { TaskEvolution } from "@/features/tasks/types/task-evolution.types";
import { getTaskExplorationSummary } from "@/features/tasks/domain/task-evolution";
import { buildTaskEvolutionHref, getEvolutionAttention } from "@/features/tasks/utils/task-evolution-navigation";
import { TaskEvolutionGraph } from "./task-evolution-graph";

export function TaskEvolutionPreview({ evolution }: { evolution: TaskEvolution }) {
  const summary = getTaskExplorationSummary(evolution);
  const attention = getEvolutionAttention(evolution);
  return (
    <div className="task-evolution-preview">
      {attention ? (
        <Link
          className="task-evolution-preview__attention"
          href={buildTaskEvolutionHref(evolution.taskId, attention.target)}
        >
          <span>
            <strong>{attention.label}</strong>
            <span>{attention.title}</span>
          </span>
          <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
      ) : null}
      {evolution.branches.length ? (
        <div className="task-evolution-preview__summary">
          <GitBranch size={14} aria-hidden="true" />
          <span>{evolution.branches.length} 个方案</span>
          {summary.activeBranches ? <span>{summary.activeBranches} 项探索中</span> : null}
        </div>
      ) : null}
      {evolution.events.length > 1 ? <TaskEvolutionGraph evolution={evolution} compact /> : null}
    </div>
  );
}
