import { z } from "zod";
import { taskEvolutionCommandSchema, taskGoalSchema } from "./task-evolution-schema";
import { taskStatusSchema } from "@/features/tasks/types/task-values";

const id = z.string().min(1).max(200);
const version = z.number().int().nonnegative();
const date = z.iso.datetime();
const point = z.strictObject({ id, text: z.string() });
export const taskEvolutionSnapshotSchema = z.strictObject({
  schemaVersion: z.literal(1),
  taskId: id,
  baselineStatus: taskStatusSchema,
  revision: version,
  goalVersion: version,
  goal: taskGoalSchema,
  status: taskStatusSchema,
  branches: z.array(
    z.strictObject({
      id,
      title: z.string(),
      question: z.string(),
      status: z.enum(["planned", "exploring", "ended", "paused"]),
      originEventId: id,
      baseGoalVersion: version,
      reviewedGoalVersion: version,
      steps: z.array(z.strictObject({ id, title: z.string(), done: z.boolean() })),
    }),
  ),
  results: z.array(
    z.strictObject({
      id,
      branchId: id,
      summary: z.string(),
      points: z.array(point),
      occurredAt: date,
      goalVersion: version,
    }),
  ),
  adoptions: z.array(
    z.strictObject({
      id,
      branchId: id,
      resultId: id,
      selectedPoints: z.array(point),
      reason: z.string(),
      beforeGoal: taskGoalSchema,
      afterGoal: taskGoalSchema,
      withdrawnBy: id.optional(),
    }),
  ),
  events: z
    .array(
      z.strictObject({
        id,
        revision: version,
        occurredAt: date,
        kind: z.enum([
          "baseline",
          ...taskEvolutionCommandSchema.shape.action.options.map((option) => option.shape.type.value),
        ]),
        branchId: id.optional(),
        command: taskEvolutionCommandSchema.optional(),
        beforeGoal: taskGoalSchema,
        afterGoal: taskGoalSchema,
        goalVersion: version,
      }),
    )
    .min(1),
});
