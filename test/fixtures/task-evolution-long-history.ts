import {
  applyTaskEvolutionCommand,
  branchNeedsReview,
  initializeTaskEvolution,
} from "../../src/features/tasks/domain/task-evolution";
import type { Task } from "../../src/features/tasks/types/task.types";
import type { TaskEvolutionAction } from "../../src/features/tasks/schemas/task-evolution-schema";

export function longHistoryFixture(eventCount: number, branchCount: number, titlePrefix = ""): Task {
  const now = "2026-11-18T00:00:00.000Z";
  const task: Task = {
    id: `history-${eventCount}-${branchCount}`,
    title: `${titlePrefix ? `${titlePrefix} ` : ""}建立个人知识库，并持续验证检索质量与维护成本`,
    description: "长历史与多分支性能样例",
    status: "in_progress",
    priority: "medium",
    tags: ["性能验收"],
    createdAt: now,
    updatedAt: now,
  };
  let state = initializeTaskEvolution(task, now, {
    objective: task.title,
    successCriteria: "能够检索 80 篇资料，每周维护不超过 30 分钟",
  });
  while (state.events.length < eventCount) {
    const index = state.events.length;
    let action: TaskEvolutionAction;
    if (state.branches.length < branchCount)
      action = {
        type: "create_branch",
        title: `方案 ${index}：验证资料组织、检索方式与长期维护成本`,
        question: "该方案是否能同时提高检索质量并降低维护成本？",
      };
    else {
      const branch = state.branches[index % state.branches.length];
      const result = [...state.results]
        .reverse()
        .find(
          (result) =>
            result.branchId === branch.id &&
            result.goalVersion === state.goalVersion &&
            !state.adoptions.some((adoption) => adoption.resultId === result.id),
        );
      if (branchNeedsReview(state, branch))
        action = { type: "review_branch", branchId: branch.id, reason: "已核对当前目标，继续验证" };
      else if (branch.status === "paused")
        action = { type: "set_branch_status", branchId: branch.id, status: "exploring", reason: "继续验证" };
      else if (index % 211 === 0)
        action = {
          type: "adjust_goal",
          goal: {
            objective: task.title,
            successCriteria: `能够检索 ${80 + index} 篇资料，并验证每周维护不超过 30 分钟`,
          },
          reason: "根据阶段验证调整范围",
        };
      else if (index % 37 === 0)
        action = {
          type: "submit_result",
          branchId: branch.id,
          summary: `第 ${index} 轮验证完成，保留有效的目录与关联方法`,
          points: ["限制目录层级", "保留来源与双向链接", "定期复核检索质量"],
        };
      else if (index % 5 === 0 && result)
        action = {
          type: "adopt_result",
          branchId: branch.id,
          resultId: result.id,
          pointIds: [result.points[0].id],
          goal: state.goal,
          reason: "采用本轮验证中有效的组织方法",
        };
      else if (index % 97 === 0)
        action = { type: "set_branch_status", branchId: branch.id, status: "paused", reason: "等待后续资料完成验证" };
      else
        action = {
          type: "record_progress",
          branchId: branch.id,
          note: `第 ${index} 次验证：整理资料、检查检索结果，记录维护成本与需要继续探索的限制。`,
        };
    }
    state = applyTaskEvolutionCommand(
      state,
      { operationId: `event-${index}`, expectedRevision: state.revision, action },
      now,
    );
  }
  return { ...task, title: state.goal.objective, evolution: state };
}
