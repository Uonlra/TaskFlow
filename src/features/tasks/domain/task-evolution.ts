import { taskEvolutionCommandSchema, taskGoalSchema } from "@/features/tasks/schemas/task-evolution-schema";
import type { TaskGoal } from "@/features/tasks/schemas/task-evolution-schema";
import type { ExplorationBranch, TaskEvolution } from "@/features/tasks/types/task-evolution.types";
import type { Task } from "@/features/tasks/types/task.types";

export class TaskEvolutionError extends Error {
  constructor(
    public readonly code: "conflict" | "invalid" | "not_found",
    message: string,
  ) {
    super(message);
    this.name = "TaskEvolutionError";
  }
}

function requireCondition(condition: unknown, message: string): asserts condition {
  if (!condition) throw new TaskEvolutionError("invalid", message);
}

/** A baseline captures what is known now; it does not invent past activity. */
export function initializeTaskEvolution(task: Task, capturedAt: string, goal?: TaskGoal): TaskEvolution {
  requireCondition(!task.deletedAt, "已删除的任务无法开始探索。");
  requireCondition(Boolean(task.id), "任务缺少标识。");
  requireCondition(Number.isFinite(Date.parse(capturedAt)), "记录时间不正确。");
  const currentGoal = taskGoalSchema.parse(goal ?? { objective: task.title, successCriteria: "" });
  return {
    schemaVersion: 1,
    taskId: task.id,
    baselineStatus: task.status,
    revision: 0,
    goalVersion: 0,
    goal: currentGoal,
    status: task.status,
    branches: [],
    results: [],
    adoptions: [],
    events: [
      {
        id: `baseline:${task.id}`,
        revision: 0,
        occurredAt: capturedAt,
        kind: "baseline",
        beforeGoal: { ...currentGoal },
        afterGoal: { ...currentGoal },
        goalVersion: 0,
      },
    ],
  };
}

/**
 * Pure transition: validate everything before returning a complete new aggregate.
 * Repositories must persist it with compare-and-swap on the original revision.
 * This function alone is not a database transaction or synchronization mechanism.
 */
export function applyTaskEvolutionCommand(state: TaskEvolution, input: unknown, occurredAt: string): TaskEvolution {
  const parsed = taskEvolutionCommandSchema.safeParse(input);
  if (!parsed.success) throw new TaskEvolutionError("invalid", "任务操作字段不符合要求。");
  const command = parsed.data;
  const previous = state.events.find((event) => event.id === command.operationId);
  if (previous) {
    if (JSON.stringify(previous.command) !== JSON.stringify(command)) {
      throw new TaskEvolutionError("conflict", "操作标识已用于其他内容，请刷新后重试。");
    }
    return state;
  }
  if (command.expectedRevision !== state.revision) {
    throw new TaskEvolutionError("conflict", "任务已有新的修改，请刷新后再操作。");
  }
  requireCondition(Number.isFinite(Date.parse(occurredAt)), "记录时间不正确。");
  const action = command.action;
  requireCondition(state.status !== "done" || action.type === "reopen", "请先重新打开已完成任务。");
  requireCondition(state.status === "done" || action.type !== "reopen", "任务尚未完成。");
  const next = structuredClone(state);
  const beforeGoal = { ...state.goal };
  let eventBranchId: string | undefined;
  const branch = (id: string): ExplorationBranch => {
    const found = next.branches.find((item) => item.id === id);
    if (!found) throw new TaskEvolutionError("not_found", "没有找到当前任务的探索分支。");
    eventBranchId = id;
    return found;
  };
  const editableBranch = (id: string) => {
    const found = branch(id);
    requireCondition(found.status === "planned" || found.status === "exploring", "请先恢复此分支的探索。");
    requireCondition(!branchNeedsReview(next, found), "主目标已调整，请先检查此分支。");
    return found;
  };
  const setGoal = (goal: TaskGoal) => {
    if (!sameGoal(next.goal, goal)) {
      next.goal = { ...goal };
      next.goalVersion++;
    }
  };

  switch (action.type) {
    case "create_branch": {
      eventBranchId = command.operationId;
      next.branches.push({
        id: command.operationId,
        title: action.title,
        question: action.question,
        status: "planned",
        originEventId: command.operationId,
        baseGoalVersion: next.goalVersion,
        reviewedGoalVersion: next.goalVersion,
        steps: [],
      });
      break;
    }
    case "add_step":
      editableBranch(action.branchId).steps.push({ id: command.operationId, title: action.title, done: false });
      break;
    case "set_step_done": {
      const step = editableBranch(action.branchId).steps.find((item) => item.id === action.stepId);
      if (!step) throw new TaskEvolutionError("not_found", "没有找到当前分支的执行步骤。");
      step.done = action.done;
      break;
    }
    case "record_progress":
      if (action.branchId) editableBranch(action.branchId);
      break;
    case "submit_result":
      editableBranch(action.branchId);
      next.results.push({
        id: command.operationId,
        branchId: action.branchId,
        summary: action.summary,
        occurredAt,
        goalVersion: next.goalVersion,
        points: action.points.map((text, index) => ({ id: `${command.operationId}:${index}`, text })),
      });
      break;
    case "adopt_result": {
      const source = branch(action.branchId);
      requireCondition(!branchNeedsReview(next, source), "主目标已调整，请先检查此分支。");
      const result = next.results.find((item) => item.id === action.resultId && item.branchId === source.id);
      if (!result) throw new TaskEvolutionError("not_found", "没有找到当前分支的成果版本。");
      const points = action.pointIds.map((id) => result.points.find((point) => point.id === id));
      requireCondition(
        points.every((point) => point !== undefined),
        "选择的成果内容不存在。",
      );
      const adopted = next.adoptions.filter((item) => !item.withdrawnBy && item.resultId === result.id);
      requireCondition(
        !adopted.some((item) => item.selectedPoints.some((point) => action.pointIds.includes(point.id))),
        "所选内容已经采纳，请选择尚未采纳的成果。",
      );
      setGoal(action.goal);
      next.adoptions.push({
        id: command.operationId,
        branchId: source.id,
        resultId: result.id,
        selectedPoints: points.map((point) => ({ ...point! })),
        reason: action.reason,
        beforeGoal,
        afterGoal: { ...next.goal },
      });
      // Adoption alone never closes a branch or silently acknowledges a changed goal.
      break;
    }
    case "adjust_goal":
      requireCondition(!sameGoal(next.goal, action.goal), "目标没有变化。");
      setGoal(action.goal);
      break;
    case "review_branch":
      branch(action.branchId).reviewedGoalVersion = next.goalVersion;
      break;
    case "set_branch_status": {
      const source = branch(action.branchId);
      requireCondition(source.status !== action.status, "分支状态没有变化。");
      if (action.status === "exploring" || action.status === "planned") {
        requireCondition(!branchNeedsReview(next, source), "主目标已调整，请先检查此分支。");
      }
      source.status = action.status;
      break;
    }
    case "withdraw_adoption": {
      const adoption = next.adoptions.find((item) => item.id === action.adoptionId);
      if (!adoption) throw new TaskEvolutionError("not_found", "没有找到这次采纳记录。");
      requireCondition(!adoption.withdrawnBy, "这次采纳已经撤回。");
      eventBranchId = adoption.branchId;
      adoption.withdrawnBy = command.operationId;
      setGoal(action.goal);
      break;
    }
    case "complete":
      requireCondition(next.goal.successCriteria.trim(), "请先填写当前目标的完成标准。");
      requireCondition(
        next.branches.every((item) => item.status === "ended" || item.status === "paused"),
        "请先结束、搁置或转出仍在探索的分支。",
      );
      next.status = "done";
      break;
    case "reopen":
      next.status = "in_progress";
      break;
  }
  next.revision++;
  next.events.push({
    id: command.operationId,
    revision: next.revision,
    occurredAt,
    kind: action.type,
    branchId: eventBranchId,
    command,
    beforeGoal,
    afterGoal: { ...next.goal },
    goalVersion: next.goalVersion,
  });
  return next;
}

export function branchNeedsReview(state: TaskEvolution, branch: ExplorationBranch): boolean {
  return branch.reviewedGoalVersion !== state.goalVersion;
}

/** Only explicitly submitted results with unadopted content count as decisions. */
export function getTaskExplorationSummary(state: TaskEvolution) {
  const pendingResults = state.results.filter((result) => {
    const source = state.branches.find((branch) => branch.id === result.branchId);
    if (!source || source.status === "paused" || branchNeedsReview(state, source)) return false;
    const adoptedIds = new Set(
      state.adoptions
        .filter((item) => item.resultId === result.id && !item.withdrawnBy)
        .flatMap((item) => item.selectedPoints.map((point) => point.id)),
    );
    return result.points.some((point) => !adoptedIds.has(point.id));
  });
  return {
    activeBranches: state.branches.filter((item) => item.status === "planned" || item.status === "exploring").length,
    branchesNeedingReview: state.branches.filter(
      (item) => item.status !== "ended" && item.status !== "paused" && branchNeedsReview(state, item),
    ).length,
    pendingResults: pendingResults.length,
  };
}

function sameGoal(left: TaskGoal, right: TaskGoal) {
  return left.objective === right.objective && left.successCriteria === right.successCriteria;
}
