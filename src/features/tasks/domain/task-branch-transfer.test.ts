import { describe, expect, it } from "vitest";
import {
  executeTaskEvolution,
  newTransferredTasks,
  parseTaskEvolution,
  restoreTaskEvolution,
  transferTaskBranch,
} from "./task-evolution-storage";
import { getTaskExplorationSummary } from "./task-evolution";
import { getEvolutionAttention } from "@/features/tasks/utils/task-evolution-navigation";
import { taskOriginHref, transferredTaskHref } from "@/features/tasks/utils/task-transfer-navigation";
import { buildEvolutionGraph } from "@/features/tasks/utils/task-evolution-graph";
import { branchTransferFixture, transferredTaskId } from "../../../../test/fixtures/task-branch-transfer";
import { graphFixtureTime } from "../../../../test/fixtures/task-evolution";

describe("branch transfer", () => {
  it("creates an independent goal while preserving source steps, results, adoptions and target", () => {
    const { task, command } = branchTransferFixture();
    const before = structuredClone(task);
    const result = transferTaskBranch(task, command, graphFixtureTime);
    expect(task).toEqual(before);
    expect(result.source.title).toBe(task.title);
    expect(result.source.evolution?.goal).toEqual(task.evolution?.goal);
    expect(result.source.evolution?.results).toEqual(task.evolution?.results);
    expect(result.source.evolution?.adoptions).toEqual(task.evolution?.adoptions);
    expect(result.source.evolution?.branches[0]).toMatchObject({ status: "ended", transferredTaskId });
    expect(result.task).toMatchObject({
      id: transferredTaskId,
      status: "in_progress",
      title: "独立验证资料组织方式",
      description: "能否降低维护成本？",
      evolution: {
        revision: 0,
        branches: [],
        results: [],
        adoptions: [],
        origin: { taskId: task.id, branchId: "a", eventId: command.operationId },
      },
    });
    expect(parseTaskEvolution(result.source.evolution)).toEqual(result.source.evolution);
    expect(parseTaskEvolution(result.task!.evolution)).toEqual(result.task!.evolution);
    expect(taskOriginHref(result.task!.evolution!)).toBe("/tasks/graph-fixture?event=transfer-a&branch=a");
    expect(getTaskExplorationSummary(result.source.evolution!).activeBranches).toBe(0);
    expect(getEvolutionAttention(result.source.evolution!)?.target.branchId).toBe("c");
  });

  it("keeps retries idempotent even after later source edits, and blocks further work on the old branch", () => {
    const { task, command } = branchTransferFixture();
    const result = transferTaskBranch(task, command, graphFixtureTime);
    const later = executeTaskEvolution(
      result.source,
      {
        operationId: "later",
        expectedRevision: result.source.evolution!.revision,
        action: { type: "record_progress", note: "继续主线" },
      },
      graphFixtureTime,
    );
    expect(transferTaskBranch(later, command, graphFixtureTime)).toEqual({ source: later, task: null });
    for (const action of [
      { type: "submit_result", branchId: "a", summary: "不应推进", points: ["内容"] },
      { type: "set_branch_status", branchId: "a", status: "exploring", reason: "恢复" },
      { type: "review_branch", branchId: "a", reason: "复查" },
      {
        type: "adopt_result",
        branchId: "a",
        resultId: "ra2",
        pointIds: ["ra2:0"],
        goal: task.evolution!.goal,
        reason: "采纳",
      },
    ]) {
      expect(() =>
        executeTaskEvolution(
          later,
          { operationId: action.type, expectedRevision: later.evolution!.revision, action },
          graphFixtureTime,
        ),
      ).toThrow("已转为独立任务");
    }
    expect(() =>
      transferTaskBranch(
        result.source,
        { ...command, operationId: "again", expectedRevision: result.source.evolution!.revision },
        graphFixtureTime,
      ),
    ).toThrow("已转为独立任务");
    expect(() => executeTaskEvolution(task, command, graphFixtureTime)).toThrow("同时保存两个任务");
  });

  it("enforces revision, goal review and explicit completion criteria before transfer", () => {
    const { task, command } = branchTransferFixture();
    expect(() => transferTaskBranch(task, { ...command, expectedRevision: 0 }, graphFixtureTime)).toThrow("新的修改");
    expect(() =>
      transferTaskBranch(
        task,
        { ...command, action: { ...command.action, goal: { objective: "新目标", successCriteria: "" } } },
        graphFixtureTime,
      ),
    ).toThrow("字段");
    const changed = executeTaskEvolution(
      task,
      {
        operationId: "goal",
        expectedRevision: task.evolution!.revision,
        action: { type: "adjust_goal", goal: { objective: "调整目标", successCriteria: "可检索" }, reason: "范围变化" },
      },
      graphFixtureTime,
    );
    expect(() =>
      transferTaskBranch(changed, { ...command, expectedRevision: changed.evolution!.revision }, graphFixtureTime),
    ).toThrow("先检查");
  });

  it("renders a transfer on the branch without inventing a merge", () => {
    const { task, command } = branchTransferFixture();
    const result = transferTaskBranch(task, command, graphFixtureTime);
    const graph = buildEvolutionGraph(result.source.evolution!);
    expect(graph.nodes.find((node) => node.event.id === command.operationId)).toMatchObject({
      main: false,
      branchId: "a",
      marker: "transferred",
    });
    expect(graph.edges.some((edge) => edge.kind === "merge" && edge.id.includes(command.operationId))).toBe(false);
  });

  it("preserves imported history but detaches old cross-task links and skips recreating old targets", () => {
    const { task, command } = branchTransferFixture();
    const result = transferTaskBranch(task, command, graphFixtureTime);
    const source = restoreTaskEvolution(result.source.evolution, "copy");
    expect(source.events.at(-1)).toEqual(result.source.evolution?.events.at(-1));
    expect(transferredTaskHref(source, source.branches[0])).toBeNull();
    expect(newTransferredTasks(source)).toEqual([]);
    expect(taskOriginHref(restoreTaskEvolution(result.task!.evolution, "copy-target"))).toBeNull();
    expect(newTransferredTasks(result.source.evolution!)).toEqual([result.task]);
  });

  it("allows fresh transfers from an imported task without reviving its detached historical links", () => {
    const { task, command } = branchTransferFixture();
    const first = transferTaskBranch(task, command, graphFixtureTime);
    const restored = restoreTaskEvolution(first.source.evolution, "copy");
    const copied = { ...task, id: "copy", evolution: restored };
    const second = transferTaskBranch(
      copied,
      {
        ...command,
        operationId: "transfer-c",
        expectedRevision: restored.revision,
        action: {
          ...command.action,
          type: "transfer_branch",
          branchId: "c",
          targetTaskId: "10000000-0000-4000-8000-000000000002",
          goal: { objective: "新探索", successCriteria: "完成验证" },
          reason: "单独推进",
        },
      },
      graphFixtureTime,
    );
    expect(transferredTaskHref(second.source.evolution!, second.source.evolution!.branches[0])).toBeNull();
    expect(transferredTaskHref(second.source.evolution!, second.source.evolution!.branches[2])).toBe(
      "/tasks/10000000-0000-4000-8000-000000000002",
    );
    expect(newTransferredTasks(second.source.evolution!)).toEqual([second.task]);
  });
});
