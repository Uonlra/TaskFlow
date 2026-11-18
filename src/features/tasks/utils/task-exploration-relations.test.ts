import { describe, expect, it } from "vitest";
import { buildExplorationRelations } from "./task-exploration-relations";
import { graphCommand, graphFixture, graphFixtureGoal } from "../../../../test/fixtures/task-evolution";

describe("workbench exploration relations", () => {
  it("links real branch origins and the latest available result without including withdrawn adoptions", () => {
    const [a, b, c] = buildExplorationRelations(graphFixture());
    expect(a.href).toBe("/tasks/graph-fixture?event=a&branch=a");
    expect(a.resultCount).toBe(2);
    expect(a.adoptedPointCount).toBe(1);
    expect(a.action).toEqual({
      label: "采纳",
      href: "/tasks/graph-fixture?event=ra2&branch=a&result=ra2&action=adopt",
    });
    expect(b.action).toBeNull();
    expect(c.branch.status).toBe("ended");
    expect(c.action?.href).toContain("result=rc&action=adopt");
  });

  it("requires goal review before reuse, including paused and ended sources", () => {
    const changed = graphCommand(graphFixture(), "goal", {
      type: "adjust_goal",
      goal: { ...graphFixtureGoal, objective: "新目标" },
      reason: "收敛",
    });
    const relations = buildExplorationRelations(changed);
    expect(relations.every(({ needsReview, action }) => needsReview && action?.label === "检查")).toBe(true);
    expect(relations[1].action?.href).toBe("/tasks/graph-fixture?branch=b&action=review");
    const reviewed = graphCommand(changed, "review", { type: "review_branch", branchId: "a", reason: "旧成果仍适用" });
    expect(buildExplorationRelations(reviewed)[0].action?.href).toContain("result=ra2&action=adopt");
  });

  it("keeps complete tasks read-only and does not invent results for an empty branch", () => {
    const state = graphCommand(graphFixture(), "d", { type: "create_branch", title: "新方案", question: "可行吗？" });
    expect(buildExplorationRelations(state).at(-1)).toMatchObject({
      resultCount: 0,
      adoptedPointCount: 0,
      action: null,
    });
    expect(buildExplorationRelations({ ...state, status: "done" }).every(({ action }) => action === null)).toBe(true);
  });
});
