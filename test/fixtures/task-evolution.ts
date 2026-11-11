import { initializeTaskEvolution, applyTaskEvolutionCommand } from "@/features/tasks/domain/task-evolution";
import type { TaskEvolutionAction } from "@/features/tasks/schemas/task-evolution-schema";
import type { TaskEvolution } from "@/features/tasks/types/task-evolution.types";

export const graphFixtureTime = "2026-11-10T00:00:00.000Z";
export const graphFixtureGoal = { objective: "建立个人知识库", successCriteria: "能够检索 80 篇资料" };
export function graphCommand(state: TaskEvolution, operationId: string, action: TaskEvolutionAction) {
  return applyTaskEvolutionCommand(state, { operationId, expectedRevision: state.revision, action }, graphFixtureTime);
}
export function graphFixture() {
  let state = initializeTaskEvolution(
    {
      id: "graph-fixture",
      title: graphFixtureGoal.objective,
      description: "",
      status: "in_progress",
      priority: "medium",
      tags: [],
      createdAt: graphFixtureTime,
    },
    graphFixtureTime,
    graphFixtureGoal,
  );
  const apply = (id: string, action: TaskEvolutionAction) => {
    state = graphCommand(state, id, action);
  };
  apply("a", { type: "create_branch", title: "Markdown 方案", question: "能否降低维护成本？" });
  apply("note-a", { type: "record_progress", branchId: "a", note: "准备 80 篇资料" });
  apply("ra", {
    type: "submit_result",
    branchId: "a",
    summary: "目录与链接验证有效",
    points: ["目录组织", "双向链接"],
  });
  apply("b", { type: "create_branch", title: "自动分类方案", question: "自动分类是否值得投入？" });
  apply("rb", { type: "submit_result", branchId: "b", summary: "维护成本偏高", points: ["需要人工校对分类"] });
  apply("m1", {
    type: "adopt_result",
    branchId: "a",
    resultId: "ra",
    pointIds: ["ra:0"],
    reason: "先确定组织方式",
    goal: graphFixtureGoal,
  });
  apply("main-note", { type: "record_progress", note: "继续比较检索效果" });
  apply("m2", {
    type: "adopt_result",
    branchId: "a",
    resultId: "ra",
    pointIds: ["ra:1"],
    reason: "补充关联方法",
    goal: graphFixtureGoal,
  });
  apply("pause-b", { type: "set_branch_status", branchId: "b", status: "paused", reason: "投入过高" });
  apply("c", { type: "create_branch", title: "搜索工具方案", question: "本地搜索是否足够？" });
  apply("rc", { type: "submit_result", branchId: "c", summary: "可作为后续方向", points: ["搜索需要更精确的标签"] });
  apply("end-c", { type: "set_branch_status", branchId: "c", status: "ended", reason: "验证结束，暂未采纳" });
  apply("ra2", { type: "submit_result", branchId: "a", summary: "继续验证目录层级", points: ["限制目录深度"] });
  apply("w2", { type: "withdraw_adoption", adoptionId: "m2", reason: "关联方式还需验证", goal: graphFixtureGoal });
  return state;
}
