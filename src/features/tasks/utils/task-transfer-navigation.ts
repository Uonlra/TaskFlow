import type { ExplorationBranch, TaskEvolution } from "@/features/tasks/types/task-evolution.types";
import { buildTaskEvolutionHref } from "./task-evolution-navigation";

export function transferredTaskHref(state: TaskEvolution, branch: ExplorationBranch) {
  const event = state.events.find((event) => event.branchId === branch.id && event.kind === "transfer_branch");
  if (!branch.transferredTaskId || !event || event.revision <= (state.detachedTaskLinksThrough ?? -1)) return null;
  return buildTaskEvolutionHref(branch.transferredTaskId);
}

export function taskOriginHref(state: TaskEvolution) {
  const origin = state.origin;
  return origin && state.detachedTaskLinksThrough === undefined
    ? buildTaskEvolutionHref(origin.taskId, { branchId: origin.branchId, eventId: origin.eventId })
    : null;
}
