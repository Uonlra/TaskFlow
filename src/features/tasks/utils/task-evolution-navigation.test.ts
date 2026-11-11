import { describe, expect, it } from "vitest";
import { buildTaskEvolutionHref, getEvolutionAttention, latestTask } from "./task-evolution-navigation";
import { graphCommand, graphFixture } from "../../../../test/fixtures/task-evolution";

describe("evolution quick-view decisions", () => {
  it("links the newest submitted unadopted result, without treating progress as a result", () => {
    let state = graphFixture();
    state = graphCommand(state, "progress", { type: "record_progress", note: "继续尝试" });
    expect(getEvolutionAttention(state)?.target).toMatchObject({ resultId: "ra2", action: "adopt" });
    const noResult = { ...state, results: [] };
    expect(getEvolutionAttention(noResult)).toBeNull();
    expect(getEvolutionAttention({ ...state, status: "done" })).toBeNull();
  });
  it("prioritizes changed-goal review and ignores paused branches", () => {
    const state = graphCommand(graphFixture(), "goal", {
      type: "adjust_goal",
      goal: { objective: "新目标", successCriteria: "新标准" },
      reason: "收敛",
    });
    expect(getEvolutionAttention(state)?.target).toEqual({ branchId: "a", action: "review" });
    expect(
      getEvolutionAttention({ ...state, branches: state.branches.map((branch) => ({ ...branch, status: "paused" })) }),
    ).toBeNull();
  });
  it("encodes exact historical ids in links and prefers a complete newer revision", () => {
    const href = buildTaskEvolutionHref("a/b", { eventId: "r & 1", branchId: "b", action: "adopt", resultId: "r & 1" });
    expect(href).toBe("/tasks/a%2Fb?event=r+%26+1&branch=b&result=r+%26+1&action=adopt");
    const base = {
      id: "task",
      title: "目标",
      description: "",
      status: "in_progress" as const,
      priority: "medium" as const,
      tags: [],
      createdAt: "2026-11-10",
    };
    const complete = { ...base, evolution: graphFixture() };
    expect(latestTask(complete, base)).toBe(complete);
    expect(latestTask(base, complete)).toBe(complete);
  });
});
