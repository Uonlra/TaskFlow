import { applyTaskEvolutionCommand, initializeTaskEvolution, TaskEvolutionError } from "./task-evolution";
import { taskEvolutionSnapshotSchema } from "@/features/tasks/schemas/task-evolution-snapshot-schema";
import type { Task } from "@/features/tasks/types/task.types";
import type { TaskEvolution } from "@/features/tasks/types/task-evolution.types";
import { taskEvolutionCommandSchema } from "@/features/tasks/schemas/task-evolution-schema";
export { orderTaskTransfers } from "../utils/task-transfer-order";

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
    {
      ...(baseline.origin ? { origin: baseline.origin } : {}),
      ...(baseline.detachedTaskLinksThrough !== undefined
        ? { detachedTaskLinksThrough: baseline.detachedTaskLinksThrough }
        : {}),
    },
  );
  for (const event of state.events.slice(1)) {
    if (!event.command) fail("演进事件缺少操作内容。");
    replay = applyTaskEvolutionCommand(replay, event.command, event.occurredAt);
  }
  if (JSON.stringify(taskEvolutionSnapshotSchema.parse(replay)) !== JSON.stringify(state))
    fail("演进历史与当前内容不一致。");
  if ((state.detachedTaskLinksThrough ?? 0) > state.revision) fail("外部关系的历史版本不正确。");
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
  const command = readCommand(input);
  if (command.action.type === "transfer_branch") fail("请通过分支转出操作同时保存两个任务。");
  return evolveTask(task, command, now);
}

function evolveTask(task: Task, input: unknown, now: string): Task {
  if (task.deletedAt) fail("已删除的任务无法修改。");
  assertTaskEvolutionProjection(task);
  const current = task.evolution ? parseTaskEvolution(task.evolution, task.id) : initializeTaskEvolution(task, now);
  const next = applyTaskEvolutionCommand(current, input, now);
  return next === current ? task : projectTaskEvolution(task, next, now);
}

export type TaskBranchTransferResult = { source: Task; task: Task | null };

export function transferTaskBranch(task: Task, input: unknown, now: string): TaskBranchTransferResult {
  const command = readCommand(input);
  if (command.action.type !== "transfer_branch") fail("分支转出操作不正确。");
  const source = evolveTask(task, command, now);
  return { source, task: source === task ? null : buildTransferredTask(source.evolution!, command.operationId) };
}

/** Deterministic creation snapshot, also used to materialize offline transfers in the cloud transaction. */
export function buildTransferredTask(state: TaskEvolution, eventId: string): Task {
  const event = state.events.find((item) => item.id === eventId);
  const action = event?.command?.action;
  if (!event || action?.type !== "transfer_branch") fail("没有找到转出记录。");
  const branch = state.branches.find((item) => item.id === action.branchId);
  if (!branch) fail("没有找到转出的分支。");
  const task: Task = {
    id: action.targetTaskId,
    title: action.goal.objective,
    description: branch.question,
    status: "in_progress",
    priority: "medium",
    tags: [],
    createdAt: event.occurredAt,
    updatedAt: event.occurredAt,
  };
  task.evolution = initializeTaskEvolution(task, event.occurredAt, action.goal, {
    origin: {
      taskId: state.taskId,
      branchId: branch.id,
      eventId,
      taskTitle: event.beforeGoal.objective,
      branchTitle: branch.title,
    },
  });
  withinLimit(task.evolution);
  return task;
}

export function newTransferredTasks(state: TaskEvolution, previous?: TaskEvolution): Task[] {
  return state.events
    .filter(
      (event) =>
        event.kind === "transfer_branch" &&
        event.revision > (previous?.revision ?? 0) &&
        event.revision > (state.detachedTaskLinksThrough ?? -1),
    )
    .map((event) => buildTransferredTask(state, event.id));
}

function readCommand(input: unknown) {
  const parsed = taskEvolutionCommandSchema.safeParse(input);
  if (!parsed.success) fail("任务操作字段不符合要求。");
  return parsed.data;
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
  if (state.taskId !== newTaskId && (state.origin || state.branches.some((branch) => branch.transferredTaskId))) {
    state.detachedTaskLinksThrough = state.revision;
    state.events[0].detachedTaskLinksThrough = state.revision;
  }
  state.taskId = newTaskId;
  state.events[0].id = `baseline:${newTaskId}`;
  return parseTaskEvolution(state, newTaskId);
}
