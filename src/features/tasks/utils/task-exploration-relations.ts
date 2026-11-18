import { branchNeedsReview } from "@/features/tasks/domain/task-evolution";
import type { TaskEvolution } from "@/features/tasks/types/task-evolution.types";
import { buildTaskEvolutionHref, getEvolutionAttention } from "./task-evolution-navigation";

export function buildExplorationRelations(state: TaskEvolution) {
  return state.branches.map((branch) => {
    const results = state.results.filter((result) => result.branchId === branch.id);
    const adoptedIds = new Set(
      state.adoptions
        .filter((adoption) => adoption.branchId === branch.id && !adoption.withdrawnBy)
        .flatMap((adoption) => adoption.selectedPoints.map((point) => point.id)),
    );
    const needsReview = branchNeedsReview(state, branch);
    const attention =
      state.status === "done"
        ? null
        : needsReview
          ? { label: "检查", target: { branchId: branch.id, action: "review" as const } }
          : getEvolutionAttention({ ...state, branches: [branch] });
    return {
      branch,
      needsReview,
      resultCount: results.length,
      adoptedPointCount: adoptedIds.size,
      href: buildTaskEvolutionHref(state.taskId, { branchId: branch.id, eventId: branch.originEventId }),
      action: attention
        ? {
            label: attention.target.action === "review" ? "检查" : "采纳",
            href: buildTaskEvolutionHref(state.taskId, attention.target),
          }
        : null,
    };
  });
}
