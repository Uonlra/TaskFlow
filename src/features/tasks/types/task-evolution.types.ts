import type { TaskEvolutionCommand, TaskGoal } from "@/features/tasks/schemas/task-evolution-schema";
import type { TaskStatus } from "./task-values";

export type ExplorationBranch = {
  id: string;
  title: string;
  question: string;
  status: "planned" | "exploring" | "ended" | "paused";
  originEventId: string;
  baseGoalVersion: number;
  reviewedGoalVersion: number;
  steps: { id: string; title: string; done: boolean }[];
};

export type ExplorationResult = {
  id: string;
  branchId: string;
  summary: string;
  points: { id: string; text: string }[];
  occurredAt: string;
  goalVersion: number;
};

export type ResultAdoption = {
  id: string;
  branchId: string;
  resultId: string;
  selectedPoints: { id: string; text: string }[];
  reason: string;
  beforeGoal: TaskGoal;
  afterGoal: TaskGoal;
  withdrawnBy?: string;
};

export type TaskEvolutionEvent = {
  id: string;
  revision: number;
  occurredAt: string;
  kind: "baseline" | TaskEvolutionCommand["action"]["type"];
  branchId?: string;
  command?: TaskEvolutionCommand;
  beforeGoal: TaskGoal;
  afterGoal: TaskGoal;
  goalVersion: number;
};

/** One aggregate is the consistency boundary for a main task and its explorations. */
export type TaskEvolution = {
  schemaVersion: 1;
  taskId: string;
  baselineStatus: TaskStatus;
  revision: number;
  goalVersion: number;
  goal: TaskGoal;
  status: TaskStatus;
  branches: ExplorationBranch[];
  results: ExplorationResult[];
  adoptions: ResultAdoption[];
  events: TaskEvolutionEvent[];
};
