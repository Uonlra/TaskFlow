import { describe, expect, it } from "vitest";

import {
  applyTaskEvolutionCommand,
  branchNeedsReview,
  getTaskExplorationSummary,
  initializeTaskEvolution,
} from "./task-evolution";
import type { TaskEvolutionAction, TaskGoal } from "@/features/tasks/schemas/task-evolution-schema";
import type { TaskEvolution } from "@/features/tasks/types/task-evolution.types";
import type { Task } from "@/features/tasks/types/task.types";

const now = "2026-11-10T02:00:00.000Z";
const goal: TaskGoal = { objective: "建立个人知识库", successCriteria: "整理并能检索 80 篇资料" };
const task: Task = {
  id: "task-1",
  title: goal.objective,
  description: "原始背景信息",
  status: "in_progress",
  priority: "medium",
  tags: [],
  createdAt: "2026-11-01T00:00:00.000Z",
};
const initial = () => initializeTaskEvolution(task, now, goal);
function run(state: TaskEvolution, id: string, action: TaskEvolutionAction) {
  return applyTaskEvolutionCommand(state, { operationId: id, expectedRevision: state.revision, action }, now);
}
function withResult() {
  let state = initial();
  state = run(state, "branch-a", { type: "create_branch", title: "Markdown", question: "是否容易维护？" });
  return run(state, "result-a", {
    type: "submit_result",
    branchId: "branch-a",
    summary: "验证有效",
    points: ["文件组织方法", "关联检索方法"],
  });
}
const adopt = (pointIds = ["result-a:0"], replacement = goal): TaskEvolutionAction => ({
  type: "adopt_result",
  branchId: "branch-a",
  resultId: "result-a",
  pointIds,
  reason: "维护成本可接受",
  goal: replacement,
});

describe("task evolution", () => {
  it("captures a truthful legacy baseline without inventing historical events or success criteria", () => {
    const state = initializeTaskEvolution({ ...task, status: "done" }, now);
    expect(state.status).toBe("done");
    expect(state.goal).toEqual({ objective: task.title, successCriteria: "" });
    expect(state.events).toHaveLength(1);
    expect(state.events[0]).toMatchObject({ kind: "baseline", occurredAt: now });
    expect(state.events[0].occurredAt).not.toBe(task.createdAt);
    expect(() => initializeTaskEvolution({ ...task, deletedAt: now }, now)).toThrow("已删除");
  });

  it("creates independent parallel branches with fixed origins", () => {
    let state = withResult();
    state = run(state, "branch-b", { type: "create_branch", title: "双向链接", question: "能否提高检索效率？" });
    expect(state.branches).toHaveLength(2);
    expect(state.branches[0]).toMatchObject({ originEventId: "branch-a", baseGoalVersion: 0 });
    expect(() => run(state, "nested", { type: "add_step", branchId: "other-task-branch", title: "越界" })).toThrow(
      "没有找到",
    );
  });

  it("supports branch steps and scoped progress without treating either as a result", () => {
    let state = run(initial(), "b", { type: "create_branch", title: "尝试", question: "是否有效？" });
    state = run(state, "s", { type: "add_step", branchId: "b", title: "准备样例" });
    state = run(state, "done", { type: "set_step_done", branchId: "b", stepId: "s", done: true });
    state = run(state, "note", { type: "record_progress", branchId: "b", note: "样例准备完毕" });
    state = run(state, "main-note", { type: "record_progress", note: "继续验证" });
    expect(state.branches[0].steps[0].done).toBe(true);
    expect(state.events.at(-2)?.branchId).toBe("b");
    expect(state.events.at(-1)?.branchId).toBeUndefined();
    expect(getTaskExplorationSummary(state).pendingResults).toBe(0);
  });

  it("adopts selected immutable points and changes the goal in one transition", () => {
    const state = withResult();
    const before = JSON.stringify(state);
    const next = run(state, "merge", adopt(["result-a:0"], { ...goal, objective: "文件组织与检索" }));
    expect(JSON.stringify(state)).toBe(before);
    expect(next.goal.objective).toBe("文件组织与检索");
    expect(next.adoptions[0]).toMatchObject({
      resultId: "result-a",
      beforeGoal: goal,
      selectedPoints: [{ id: "result-a:0", text: "文件组织方法" }],
    });
    expect(next.events.at(-1)).toMatchObject({ kind: "adopt_result", beforeGoal: goal, afterGoal: next.goal });
    expect(next.branches[0].status).toBe("planned");
    expect(next.revision).toBe(state.revision + 1);
  });

  it("allows partial adoption multiple times while rejecting already adopted points", () => {
    let state = run(withResult(), "merge-one", adopt());
    expect(getTaskExplorationSummary(state).pendingResults).toBe(1);
    expect(() => run(state, "duplicate", adopt())).toThrow("已经采纳");
    state = run(state, "merge-two", adopt(["result-a:1"]));
    expect(state.adoptions).toHaveLength(2);
    expect(getTaskExplorationSummary(state).pendingResults).toBe(0);
    expect(state.goalVersion).toBe(0); // Advancing a goal does not require changing it.
  });

  it("does not let later result submissions mutate earlier adoption snapshots", () => {
    let state = run(withResult(), "merge", adopt());
    state = run(state, "result-v2", {
      type: "submit_result",
      branchId: "branch-a",
      summary: "新结论",
      points: ["另一种组织方式"],
    });
    expect(state.adoptions[0].resultId).toBe("result-a");
    expect(state.adoptions[0].selectedPoints[0].text).toBe("文件组织方法");
    expect(state.results).toHaveLength(2);
  });

  it("makes the exact same operation idempotent even after subsequent edits", () => {
    const state = withResult();
    const command = { operationId: "merge", expectedRevision: state.revision, action: adopt() };
    const merged = applyTaskEvolutionCommand(state, command, now);
    const later = run(merged, "note", { type: "record_progress", note: "后续进展" });
    expect(applyTaskEvolutionCommand(later, command, now)).toBe(later);
    expect(() => applyTaskEvolutionCommand(later, { ...command, action: adopt(["result-a:1"]) }, now)).toThrow(
      "操作标识",
    );
  });

  it("rejects stale revisions instead of overwriting concurrent edits", () => {
    const state = withResult();
    expect(() =>
      applyTaskEvolutionCommand(state, { operationId: "stale", expectedRevision: 0, action: adopt() }, now),
    ).toThrow("新的修改");
  });

  it("requires branch review after a goal change while retaining original goal references", () => {
    const original = withResult();
    let state = run(original, "change", {
      type: "adjust_goal",
      goal: { ...goal, objective: "优先检索" },
      reason: "范围收敛",
    });
    expect(branchNeedsReview(state, state.branches[0])).toBe(true);
    expect(getTaskExplorationSummary(state)).toMatchObject({ branchesNeedingReview: 1, pendingResults: 0 });
    expect(() => run(state, "merge", adopt())).toThrow("检查此分支");
    expect(() =>
      run(state, "result", { type: "submit_result", branchId: "branch-a", summary: "新结论", points: ["内容"] }),
    ).toThrow("检查此分支");
    state = run(state, "review", { type: "review_branch", branchId: "branch-a", reason: "已有方法仍然适用" });
    expect(branchNeedsReview(state, state.branches[0])).toBe(false);
    expect(state.branches[0].baseGoalVersion).toBe(0);
    expect(state.results[0].goalVersion).toBe(0);
    expect(state.branches[0].reviewedGoalVersion).toBe(1);
  });

  it("requires checking the source branch too when adoption changes the main goal", () => {
    const state = run(withResult(), "merge", adopt(["result-a:0"], { ...goal, objective: "新目标" }));
    expect(branchNeedsReview(state, state.branches[0])).toBe(true);
  });

  it("withdraws explicitly without losing subsequent goal edits or history", () => {
    let state = run(withResult(), "merge", adopt());
    const newerGoal = { ...goal, objective: "新的主目标" };
    state = run(state, "change", { type: "adjust_goal", goal: newerGoal, reason: "新方向" });
    state = run(state, "withdraw", {
      type: "withdraw_adoption",
      adoptionId: "merge",
      goal: newerGoal,
      reason: "撤回成果，保留新方向",
    });
    expect(state.goal).toEqual(newerGoal);
    expect(state.adoptions[0].withdrawnBy).toBe("withdraw");
    expect(state.adoptions[0].afterGoal).toEqual(goal);
    expect(state.events.some((event) => event.id === "merge")).toBe(true);
    expect(() =>
      run(state, "withdraw-again", { type: "withdraw_adoption", adoptionId: "merge", goal, reason: "重复" }),
    ).toThrow("已经撤回");
  });

  it("allows withdrawn points to be adopted again", () => {
    let state = run(withResult(), "merge", adopt());
    state = run(state, "withdraw", { type: "withdraw_adoption", adoptionId: "merge", goal, reason: "重新评估" });
    expect(getTaskExplorationSummary(state).pendingResults).toBe(1);
    expect(run(state, "merge-again", adopt()).adoptions).toHaveLength(2);
  });

  it("pauses without producing a merge and requires resuming to record progress", () => {
    const state = run(withResult(), "pause", {
      type: "set_branch_status",
      branchId: "branch-a",
      status: "paused",
      reason: "投入过高",
    });
    expect(state.adoptions).toHaveLength(0);
    expect(getTaskExplorationSummary(state)).toMatchObject({ activeBranches: 0, pendingResults: 0 });
    expect(() => run(state, "progress", { type: "record_progress", branchId: "branch-a", note: "记录" })).toThrow(
      "恢复",
    );
    const resumed = run(state, "resume", {
      type: "set_branch_status",
      branchId: "branch-a",
      status: "exploring",
      reason: "继续验证",
    });
    expect(getTaskExplorationSummary(resumed).pendingResults).toBe(1);
  });

  it("gates completion on branch cleanup and success criteria, and supports reopening", () => {
    expect(() => run(withResult(), "finish", { type: "complete", note: "确认达成" })).toThrow("请先结束");
    const noCriteria = initializeTaskEvolution(task, now);
    expect(() => run(noCriteria, "finish", { type: "complete", note: "确认达成" })).toThrow("完成标准");
    let state = run(withResult(), "end", {
      type: "set_branch_status",
      branchId: "branch-a",
      status: "ended",
      reason: "验证结束",
    });
    state = run(state, "finish", { type: "complete", note: "按标准验收通过" });
    expect(state.status).toBe("done");
    expect(() => run(state, "note", { type: "record_progress", note: "完成后修改" })).toThrow("重新打开");
    expect(run(state, "reopen", { type: "reopen", reason: "补充验证" }).status).toBe("in_progress");
  });

  it("rejects malformed, cross-branch and unknown selections without changing any state", () => {
    const state = withResult();
    const before = JSON.stringify(state);
    expect(() => run(state, "bad", adopt(["missing"]))).toThrow("不存在");
    expect(() => run(state, "bad", adopt(["result-a:0", "result-a:0"]))).toThrow("字段");
    expect(() => run(state, "bad", { type: "create_branch", title: " ", question: "问题" })).toThrow("字段");
    expect(() => run(state, "bad", { ...adopt(), branchId: "foreign-branch" } as TaskEvolutionAction)).toThrow(
      "没有找到",
    );
    expect(() =>
      applyTaskEvolutionCommand(
        state,
        {
          operationId: "bad",
          expectedRevision: state.revision,
          action: { type: "create_branch", title: "A", question: "Q", parentBranchId: "branch-a" },
        },
        now,
      ),
    ).toThrow("字段");
    expect(JSON.stringify(state)).toBe(before);
  });

  it("uses revision order even when operation timestamps coincide", () => {
    const state = withResult();
    expect(state.events.map((event) => event.revision)).toEqual([0, 1, 2]);
    expect(state.events.every((event) => event.occurredAt === now)).toBe(true);
  });
});
