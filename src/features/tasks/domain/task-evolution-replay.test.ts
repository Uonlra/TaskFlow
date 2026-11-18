import { expect, it } from "vitest";
import { applyTaskEvolutionCommand, initializeTaskEvolution, replayTaskEvolutionCommands } from "./task-evolution";
import { graphFixture, graphFixtureTime } from "../../../../test/fixtures/task-evolution";
import { parseTaskEvolution } from "./task-evolution-storage";

it("preserves the full adoption, withdrawal and goal history when replay uses a single owned aggregate", () => {
  const state = graphFixture();
  const serialized = JSON.stringify(state);
  expect(parseTaskEvolution(state)).toEqual(JSON.parse(serialized));
  expect(JSON.stringify(state)).toBe(serialized);
});
it("a failed late replay cannot mutate the caller's starting branches or earlier commands", () => {
  const initial = initializeTaskEvolution(
    {
      id: "scratch",
      title: "目标",
      status: "in_progress",
      priority: "medium",
      description: "",
      tags: [],
      createdAt: graphFixtureTime,
    },
    graphFixtureTime,
  );
  const branch = applyTaskEvolutionCommand(
    initial,
    {
      operationId: "branch",
      expectedRevision: 0,
      action: { type: "create_branch", title: "方向", question: "验证？" },
    },
    graphFixtureTime,
  );
  const before = JSON.stringify(branch);
  const commands = [
    {
      occurredAt: graphFixtureTime,
      command: {
        operationId: "step",
        expectedRevision: 1,
        action: { type: "add_step" as const, branchId: "branch", title: "保留的步骤" },
      },
    },
    {
      occurredAt: graphFixtureTime,
      command: {
        operationId: "bad",
        expectedRevision: 2,
        action: { type: "set_step_done" as const, branchId: "branch", stepId: "missing", done: true },
      },
    },
  ];
  const commandsBefore = JSON.stringify(commands);
  expect(() => replayTaskEvolutionCommands(branch, commands)).toThrow("没有找到当前分支的执行步骤");
  expect(JSON.stringify(branch)).toBe(before);
  expect(JSON.stringify(commands)).toBe(commandsBefore);
});
