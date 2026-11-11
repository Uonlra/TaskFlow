import { z } from "zod";

const id = z.string().min(1).max(200);
const text = z.string().trim().min(1).max(10000);
export const taskGoalSchema = z.strictObject({
  objective: text,
  successCriteria: z.string().trim().max(10000),
});
const branchStatus = z.enum(["planned", "exploring", "ended", "paused"]);
const resultPoints = z.array(text).min(1).max(100);

/** Commands carry caller-generated IDs so a storage retry is safe. */
export const taskEvolutionCommandSchema = z.strictObject({
  operationId: id,
  expectedRevision: z.number().int().nonnegative(),
  action: z.discriminatedUnion("type", [
    z.strictObject({ type: z.literal("create_branch"), title: text, question: text }),
    z.strictObject({ type: z.literal("add_step"), branchId: id, title: text }),
    z.strictObject({ type: z.literal("set_step_done"), branchId: id, stepId: id, done: z.boolean() }),
    z.strictObject({ type: z.literal("record_progress"), branchId: id.optional(), note: text }),
    z.strictObject({ type: z.literal("submit_result"), branchId: id, summary: text, points: resultPoints }),
    z.strictObject({
      type: z.literal("adopt_result"),
      branchId: id,
      resultId: id,
      pointIds: z
        .array(id)
        .min(1)
        .max(100)
        .refine((ids) => new Set(ids).size === ids.length),
      reason: text,
      goal: taskGoalSchema,
    }),
    z.strictObject({ type: z.literal("adjust_goal"), goal: taskGoalSchema, reason: text }),
    z.strictObject({ type: z.literal("review_branch"), branchId: id, reason: text }),
    z.strictObject({ type: z.literal("set_branch_status"), branchId: id, status: branchStatus, reason: text }),
    // An explicit replacement goal avoids silently undoing intervening edits.
    z.strictObject({ type: z.literal("withdraw_adoption"), adoptionId: id, goal: taskGoalSchema, reason: text }),
    z.strictObject({ type: z.literal("complete"), note: text }),
    z.strictObject({ type: z.literal("reopen"), reason: text }),
  ]),
});

export type TaskGoal = z.infer<typeof taskGoalSchema>;
export type TaskEvolutionCommand = z.infer<typeof taskEvolutionCommandSchema>;
export type TaskEvolutionAction = TaskEvolutionCommand["action"];
