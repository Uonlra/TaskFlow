import { describe, expect, it } from "vitest";
import { buildExplorationComparison } from "./task-exploration-comparison";
import { graphCommand, graphFixture, graphFixtureGoal } from "../../../../test/fixtures/task-evolution";

describe("exploration comparison sources", () => {
  it("keeps separate conclusion versions and makes withdrawn points available again", () => {
    const [column] = buildExplorationComparison(graphFixture(), ["a"]);
    expect(column.results.map(({ result, version }) => [result.id, version])).toEqual([
      ["ra2", 2],
      ["ra", 1],
    ]);
    expect(column.results[0].availableIds).toEqual(["ra2:0"]);
    expect([...column.results[1].adoptedIds]).toEqual(["ra:0"]);
    expect(column.results[1].availableIds).toEqual(["ra:1"]);
  });

  it("uses the acknowledged goal, retaining the original basis until a branch is reviewed", () => {
    const goal = { objective: "优先实现资料检索", successCriteria: "可检索关联资料" };
    let state = graphCommand(graphFixture(), "goal", { type: "adjust_goal", goal, reason: "收敛目标" });
    let [column] = buildExplorationComparison(state, ["a"]);
    expect(column.goal).toEqual(graphFixtureGoal);
    expect(column.needsReview).toBe(true);
    expect(column.canAdopt).toBe(false);
    state = graphCommand(state, "review", { type: "review_branch", branchId: "a", reason: "旧成果仍适用" });
    [column] = buildExplorationComparison(state, ["a"]);
    expect(column.goal).toEqual(goal);
    expect(column.branch.baseGoalVersion).toBe(0);
    expect(column.branch.reviewedGoalVersion).toBe(1);
    expect(column.canAdopt).toBe(true);
    expect(column.results[0].result.goalVersion).toBe(0);
  });

  it("blocks paused and completed work while preserving ended branches for adoption", () => {
    const state = graphFixture();
    expect(buildExplorationComparison(state, ["a", "b", "c"]).map(({ canAdopt }) => canAdopt)).toEqual([
      true,
      false,
      true,
    ]);
    const complete = { ...state, status: "done" as const };
    expect(buildExplorationComparison(complete, ["a", "b", "c"]).every(({ canAdopt }) => !canAdopt)).toBe(true);
  });

  it("limits unique columns and represents branches without submitted conclusions", () => {
    const state = graphCommand(graphFixture(), "d", {
      type: "create_branch",
      title: "待验证方案",
      question: "效果如何？",
    });
    expect(buildExplorationComparison(state, ["a", "a", "b", "c", "d"]).map(({ branch }) => branch.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
    const [column] = buildExplorationComparison(state, ["missing", "d"]);
    expect(column.branch.id).toBe("d");
    expect(column.results).toEqual([]);
  });
});
