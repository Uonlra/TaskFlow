import { GitBranch } from "lucide-react";
import { getTaskExplorationSummary } from "@/features/tasks/domain/task-evolution";
import type { Task } from "@/features/tasks/types/task.types";

export function TaskExplorationIndicator({ task, onOpen }: { task: Task; onOpen?: () => void }) {
  const state = task.evolution;
  if (!state?.branches.length) return null;
  const summary = getTaskExplorationSummary(state);
  const review = state.status !== "done" && summary.branchesNeedingReview;
  const pending = state.status !== "done" && summary.pendingResults;
  const content = (
    <>
      <GitBranch size={13} aria-hidden="true" />
      <span>{state.branches.length} 个方案</span>
      {review ? (
        <span className="task-exploration-indicator__attention">待检查 {review}</span>
      ) : pending ? (
        <span className="task-exploration-indicator__attention">待采纳 {pending}</span>
      ) : null}
    </>
  );
  const title = `${state.branches.length} 个方案${review ? `，${review} 个分支待检查` : pending ? `，${pending} 份结论含未采纳成果` : ""}`;
  return onOpen ? (
    <button
      type="button"
      className="task-exploration-indicator"
      aria-label={`查看「${task.title}」的探索关系`}
      title={title}
      onClick={(event) => {
        event.stopPropagation();
        onOpen();
      }}
      onKeyDown={(event) => event.stopPropagation()}
    >
      {content}
    </button>
  ) : (
    <span className="task-exploration-indicator" title={title}>
      {content}
    </span>
  );
}
