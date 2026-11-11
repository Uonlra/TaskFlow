import { describe, expect, it } from "vitest";
import { initializeTaskEvolution } from "./task-evolution";
import {
  executeTaskEvolution,
  parseTaskEvolution,
  assertEvolutionExtension,
  restoreTaskEvolution,
  MAX_EVOLUTION_BYTES,
} from "./task-evolution-storage";
import type { Task } from "@/features/tasks/types/task.types";
const now = "2026-11-10T00:00:00.000Z";
const task: Task = {
  id: "t",
  title: "知识库",
  description: "",
  status: "todo",
  priority: "medium",
  tags: [],
  createdAt: now,
};
const start = {
  operationId: "b",
  expectedRevision: 0,
  action: { type: "create_branch", title: "A", question: "有效吗？" },
};

describe("evolution storage boundary", () => {
  it("replays saved events and rejects forged current projections", () => {
    const saved = executeTaskEvolution(task, start, now);
    expect(parseTaskEvolution(JSON.parse(JSON.stringify(saved.evolution)), "t")).toEqual(saved.evolution);
    expect(() => parseTaskEvolution({ ...saved.evolution, goal: { objective: "伪造", successCriteria: "" } })).toThrow(
      "不一致",
    );
    expect(() => parseTaskEvolution(saved.evolution, "foreign")).toThrow("不匹配");
  });
  it("restores history to a newly generated task identity without losing snapshots", () => {
    const saved = executeTaskEvolution(task, start, now);
    const restored = restoreTaskEvolution(saved.evolution, "new");
    expect(restored.taskId).toBe("new");
    expect(restored.events[0].id).toBe("baseline:new");
    expect(restored.events[1]).toEqual(saved.evolution!.events[1]);
    expect(parseTaskEvolution(restored)).toEqual(restored);
  });
  it("allows an identical command retry without changing timestamp or history", () => {
    const saved = executeTaskEvolution(task, start, now);
    expect(executeTaskEvolution(saved, start, "2026-11-11T00:00:00.000Z")).toBe(saved);
  });
  it("rejects divergent histories and evolution removal", () => {
    const first = executeTaskEvolution(task, start, now).evolution!;
    const fork = executeTaskEvolution(task, { ...start, operationId: "fork" }, now).evolution!;
    expect(() => assertEvolutionExtension(first, fork)).toThrow("分叉");
    expect(() => assertEvolutionExtension(first, undefined)).toThrow("分叉");
    expect(() => assertEvolutionExtension(first, parseTaskEvolution(first))).not.toThrow();
  });
  it("rejects corrupt or oversized snapshots rather than truncating history", () => {
    const state = initializeTaskEvolution(task, now);
    expect(() => parseTaskEvolution({ ...state, schemaVersion: 2 })).toThrow("版本");
    expect(() => parseTaskEvolution({ ...state, revision: 1 })).toThrow("不一致");
    expect(() => parseTaskEvolution({ ...state, events: [] })).toThrow();
    expect(() => parseTaskEvolution({ huge: "a".repeat(MAX_EVOLUTION_BYTES + 1) })).toThrow("容量");
  });
});
