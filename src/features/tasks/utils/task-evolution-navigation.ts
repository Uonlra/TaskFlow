import type { Task } from "@/features/tasks/types/task.types";
import type { TaskEvolution } from "@/features/tasks/types/task-evolution.types";
import { branchNeedsReview } from "@/features/tasks/domain/task-evolution";

export type TaskEvolutionTarget = {
  eventId?: string;
  branchId?: string;
  resultId?: string;
  action?: "adopt" | "review";
};

export function buildTaskEvolutionHref(id: string, target: TaskEvolutionTarget = {}) {
  const params = new URLSearchParams();
  if (target.eventId) params.set("event", target.eventId);
  if (target.branchId) params.set("branch", target.branchId);
  if (target.resultId) params.set("result", target.resultId);
  if (target.action) params.set("action", target.action);
  return `/tasks/${encodeURIComponent(id)}${params.size ? `?${params}` : ""}`;
}

export function getEvolutionAttention(state: TaskEvolution) {
  if (state.status === "done") return null;
  const review = state.branches.find(
    (branch) => ["planned", "exploring"].includes(branch.status) && branchNeedsReview(state, branch),
  );
  if (review)
    return { label: "分支待检查", title: review.title, target: { branchId: review.id, action: "review" as const } };
  const result = [...state.results].reverse().find((item) => {
    const branch = state.branches.find((branch) => branch.id === item.branchId);
    if (!branch || branch.status === "paused" || branchNeedsReview(state, branch)) return false;
    const adopted = new Set(
      state.adoptions
        .filter((adoption) => adoption.resultId === item.id && !adoption.withdrawnBy)
        .flatMap((adoption) => adoption.selectedPoints.map((point) => point.id)),
    );
    return item.points.some((point) => !adopted.has(point.id));
  });
  return result
    ? {
        label: "成果待采纳",
        title: result.summary,
        target: { branchId: result.branchId, resultId: result.id, eventId: result.id, action: "adopt" as const },
      }
    : null;
}

export function latestTask(first?: Task | null, second?: Task | null) {
  if (!first) return second;
  if (!second) return first;
  const revision = (first.evolution?.revision ?? -1) - (second.evolution?.revision ?? -1);
  if (revision) return revision > 0 ? first : second;
  return Date.parse(first.updatedAt ?? first.createdAt) > Date.parse(second.updatedAt ?? second.createdAt)
    ? first
    : second;
}
