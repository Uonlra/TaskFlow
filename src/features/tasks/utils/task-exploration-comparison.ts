import { branchNeedsReview } from "@/features/tasks/domain/task-evolution";
import type { TaskEvolution } from "@/features/tasks/types/task-evolution.types";

export function buildExplorationComparison(state: TaskEvolution, branchIds: string[]) {
  return [...new Set(branchIds)].slice(0, 3).flatMap((id) => {
    const branch = state.branches.find((item) => item.id === id);
    if (!branch) return [];
    const goal = state.events.find((event) => event.goalVersion === branch.reviewedGoalVersion)?.afterGoal;
    const needsReview = !branch.transferredTaskId && branchNeedsReview(state, branch);
    const results = state.results
      .filter((result) => result.branchId === id)
      .map((result, index) => {
        const adoptedIds = new Set(
          state.adoptions
            .filter((adoption) => adoption.resultId === result.id && !adoption.withdrawnBy)
            .flatMap((adoption) => adoption.selectedPoints.map((point) => point.id)),
        );
        return {
          result,
          version: index + 1,
          adoptedIds,
          availableIds: result.points.filter((point) => !adoptedIds.has(point.id)).map((point) => point.id),
        };
      })
      .reverse();
    return [
      {
        branch,
        goal,
        needsReview,
        results,
        canAdopt: state.status !== "done" && !branch.transferredTaskId && branch.status !== "paused" && !needsReview,
      },
    ];
  });
}
