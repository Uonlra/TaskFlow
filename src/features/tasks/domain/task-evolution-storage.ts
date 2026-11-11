import { applyTaskEvolutionCommand, initializeTaskEvolution, TaskEvolutionError } from "./task-evolution";
import { taskEvolutionSnapshotSchema } from "@/features/tasks/schemas/task-evolution-snapshot-schema";
import type { Task } from "@/features/tasks/types/task.types";
import type { TaskEvolution } from "@/features/tasks/types/task-evolution.types";

// A bounded single-row aggregate makes all supported stores commit it atomically.
export const MAX_EVOLUTION_BYTES = 1000000;
function fail(message: string): never {
  throw new TaskEvolutionError("invalid", message);
}
function withinLimit(value: unknown) {
  if (new TextEncoder().encode(JSON.stringify(value)).length > MAX_EVOLUTION_BYTES)
    fail("任务演进记录超过当前存储容量，请先导出备份。");
}

/** Validate references and projections by replay, rather than trusting imported snapshots. */
export function parseTaskEvolution(value: unknown, taskId?: string): TaskEvolution {
  withinLimit(value);
  const parsed = taskEvolutionSnapshotSchema.safeParse(value);
  if (!parsed.success) fail("任务演进数据损坏或版本不支持，未覆盖原记录。");
  const state = parsed.data;
  if (taskId && state.taskId !== taskId) fail("任务与演进记录不匹配。");
  const baseline = state.events[0];
  let replay = initializeTaskEvolution(
    {
      id: state.taskId,
      title: baseline.beforeGoal.objective,
      description: "",
      tags: [],
      status: state.baselineStatus,
      priority: "medium",
      createdAt: baseline.occurredAt,
    },
    baseline.occurredAt,
    baseline.beforeGoal,
  );
  for (const event of state.events.slice(1)) {
    if (!event.command) fail("演进事件缺少操作内容。");
    replay = applyTaskEvolutionCommand(replay, event.command, event.occurredAt);
  }
  if (JSON.stringify(taskEvolutionSnapshotSchema.parse(replay)) !== JSON.stringify(state))
    fail("演进历史与当前内容不一致。");
  return state;
}

export function readTaskEvolutionJson(value: string | null | undefined, taskId: string) {
  if (value == null) return undefined;
  try {
    return parseTaskEvolution(JSON.parse(value), taskId);
  } catch (error) {
    if (error instanceof TaskEvolutionError) throw error;
    return fail("无法读取任务演进记录。");
  }
}

export function projectTaskEvolution(task: Task, evolution: TaskEvolution, updatedAt: string): Task {
  if (evolution.taskId !== task.id) fail("任务与演进记录不匹配。");
  withinLimit(evolution);
  return {
    ...task,
    title: evolution.goal.objective,
    status: evolution.status,
    evolution,
    updatedAt,
    completedAt: evolution.status === "done" ? (task.completedAt ?? updatedAt) : undefined,
  };
}

export function executeTaskEvolution(task: Task, input: unknown, now: string): Task {
  if (task.deletedAt) fail("已删除的任务无法修改。");
  assertTaskEvolutionProjection(task);
  const current = task.evolution ? parseTaskEvolution(task.evolution, task.id) : initializeTaskEvolution(task, now);
  const next = applyTaskEvolutionCommand(current, input, now);
  return next === current ? task : projectTaskEvolution(task, next, now);
}

/** Legacy entry points may change metadata, but cannot bypass goal/status history. */
export function assertOrdinaryTaskEdit(task: Task, input: { title: string; status: Task["status"] }) {
  assertTaskEvolutionProjection(task);
  if (task.evolution && (input.title !== task.title || input.status !== task.status)) {
    throw new TaskEvolutionError("conflict", "此任务已有演进记录，请通过目标调整或验收操作修改目标和状态。");
  }
}

export function assertTaskEvolutionProjection(task: Pick<Task, "title" | "status" | "evolution">) {
  if (task.evolution && (task.evolution.goal.objective !== task.title || task.evolution.status !== task.status)) {
    throw new TaskEvolutionError("conflict", "任务内容与演进历史不一致，请先处理数据冲突。");
  }
}

/** Snapshot sync is allowed only when it extends exactly the history already committed. */
export function assertEvolutionExtension(current: TaskEvolution | undefined, incoming: TaskEvolution | undefined) {
  if (!current) return;
  if (
    !incoming ||
    current.taskId !== incoming.taskId ||
    current.events.length > incoming.events.length ||
    JSON.stringify(current.events) !== JSON.stringify(incoming.events.slice(0, current.events.length))
  ) {
    throw new TaskEvolutionError("conflict", "两端探索记录已分叉，请保留本地记录并处理同步冲突。");
  }
}

export function restoreTaskEvolution(value: unknown, newTaskId: string): TaskEvolution {
  const state = structuredClone(parseTaskEvolution(value));
  state.taskId = newTaskId;
  state.events[0].id = `baseline:${newTaskId}`;
  return parseTaskEvolution(state, newTaskId);
}
