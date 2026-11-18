"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { ArrowUpRight, ChevronDown, GitBranch, GitMerge } from "lucide-react";
import { getTaskExplorationSummary } from "@/features/tasks/domain/task-evolution";
import type { TaskEvolution } from "@/features/tasks/types/task-evolution.types";
import { buildTaskEvolutionHref, getEvolutionAttention } from "@/features/tasks/utils/task-evolution-navigation";
import { buildExplorationRelations } from "@/features/tasks/utils/task-exploration-relations";
import { explorationStatusLabel } from "@/features/tasks/utils/task-evolution-presentation";
import { TaskRelationLink } from "./task-relation-link";

export function TaskWorkbenchExploration({
  evolution,
  initiallyOpen = false,
}: {
  evolution: TaskEvolution;
  initiallyOpen?: boolean;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const relationsId = useId();
  const summary = getTaskExplorationSummary(evolution);
  const attention = getEvolutionAttention(evolution);
  const relations = buildExplorationRelations(evolution);
  useEffect(() => {
    if (!initiallyOpen) return;
    toggleRef.current?.focus({ preventScroll: true });
    toggleRef.current?.scrollIntoView({ block: "nearest" });
  }, [initiallyOpen]);
  if (!relations.length) return null;
  return (
    <section className="task-workbench-exploration" aria-label="探索摘要">
      <button
        ref={toggleRef}
        type="button"
        className="task-workbench-exploration__toggle"
        aria-label={`探索 ${relations.length} 个方案`}
        aria-expanded={open}
        aria-controls={relationsId}
        onClick={() => setOpen(!open)}
      >
        <span>
          <GitBranch size={15} aria-hidden="true" />
          探索 <small>{relations.length}</small>
        </span>
        <span>
          {summary.activeBranches ? <small>{summary.activeBranches} 项进行中</small> : null}
          <ChevronDown size={14} aria-hidden="true" />
        </span>
      </button>
      {attention ? (
        <Link
          className="task-workbench-exploration__attention"
          aria-label={`${attention.label}：${attention.title}`}
          href={buildTaskEvolutionHref(evolution.taskId, attention.target)}
        >
          <span>
            <strong>{attention.label}</strong>
            <small>{attention.title}</small>
          </span>
          <ArrowUpRight size={15} aria-hidden="true" />
        </Link>
      ) : null}
      <div id={relationsId} hidden={!open}>
        <div className="task-workbench-relations__root">
          <span aria-hidden="true" />
          <Link href={buildTaskEvolutionHref(evolution.taskId)}>主线</Link>
        </div>
        <div
          className="task-workbench-relations__scroll"
          role="group"
          aria-label="探索关系"
          tabIndex={0}
          data-lenis-prevent-wheel="true"
        >
          <ul className="task-workbench-relations">
            {relations.map(({ branch, href, needsReview, resultCount, adoptedPointCount, action, transferHref }) => (
              <li key={branch.id} data-status={branch.status}>
                <div className="task-workbench-relations__branch">
                  <Link href={href} title={branch.title}>
                    {branch.title}
                  </Link>
                  <small>
                    {explorationStatusLabel(branch)}
                    {evolution.status !== "done" && needsReview ? " · 待检查" : ""}
                  </small>
                </div>
                <div className="task-workbench-relations__meta">
                  {transferHref ? (
                    <TaskRelationLink taskId={branch.transferredTaskId!} href={transferHref}>
                      独立任务
                      <ArrowUpRight size={12} aria-hidden="true" />
                    </TaskRelationLink>
                  ) : null}
                  {resultCount ? <span>结论 {resultCount}</span> : null}
                  {adoptedPointCount ? (
                    <span>
                      <GitMerge size={12} aria-hidden="true" />
                      已采纳 {adoptedPointCount} 项
                    </span>
                  ) : null}
                  {action ? (
                    <Link
                      href={action.href}
                      aria-label={`${action.label}「${branch.title}」${action.label === "采纳" ? "的成果" : ""}`}
                    >
                      {action.label}
                      <ArrowUpRight size={12} aria-hidden="true" />
                    </Link>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
