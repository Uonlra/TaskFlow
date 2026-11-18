import type { Task } from "@/features/tasks/types/task.types";
import type { TaskEvolutionCommand } from "@/features/tasks/schemas/task-evolution-schema";
import { graphFixture, graphFixtureTime } from "./task-evolution";

export const transferredTaskId = "10000000-0000-4000-8000-000000000001";
export function branchTransferFixture(branchId = "a") {
  const evolution = graphFixture();
  const task: Task = {
    id: evolution.taskId,
    title: evolution.goal.objective,
    status: evolution.status,
    description: "",
    priority: "high",
    tags: ["知识库"],
    createdAt: graphFixtureTime,
    evolution,
  };
  const command: TaskEvolutionCommand = {
    operationId: "transfer-a",
    expectedRevision: evolution.revision,
    action: {
      type: "transfer_branch",
      branchId,
      targetTaskId: transferredTaskId,
      goal: { objective: "独立验证资料组织方式", successCriteria: "完成 100 篇资料的检索验证" },
      reason: "值得持续投入，单独推进",
    },
  };
  return { task, command };
}
