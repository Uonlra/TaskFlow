import type { TaskEvolutionAction } from "@/features/tasks/schemas/task-evolution-schema";
import type { TaskEvolution, TaskEvolutionEvent } from "@/features/tasks/types/task-evolution.types";

export const evolutionActionLabels: Record<TaskEvolutionAction["type"], string> = {
  create_branch: "创建探索分支",
  adjust_goal: "调整目标",
  record_progress: "记录进展",
  submit_result: "提交结论",
  adopt_result: "纳入主线",
  review_branch: "检查分支",
  set_branch_status: "调整探索状态",
  add_step: "添加步骤",
  set_step_done: "更新执行步骤",
  withdraw_adoption: "撤回采纳",
  complete: "验收完成",
  reopen: "重新打开",
};
export const explorationStatusLabels = { planned: "待探索", exploring: "探索中", ended: "已结束", paused: "已搁置" };

export function describeEvolutionEvent(evolution: TaskEvolution, event: TaskEvolutionEvent) {
  const action = event.command?.action;
  const branch = evolution.branches.find((item) => item.id === event.branchId);
  const adoption = evolution.adoptions.find((item) => item.id === event.id);
  const label = event.kind === "baseline" ? "建立演进起点" : evolutionActionLabels[event.kind];
  let detail = "";
  if (action && "summary" in action) detail = action.summary;
  else if (action && "note" in action) detail = action.note;
  else if (action && "title" in action) detail = action.title;
  else if (action && "reason" in action) detail = action.reason;
  if (action?.type === "set_branch_status") detail = `${explorationStatusLabels[action.status]} · ${action.reason}`;
  if (action?.type === "adjust_goal") detail = event.afterGoal.objective;
  if (adoption) detail = `采纳 ${adoption.selectedPoints.length} 项成果 · ${adoption.reason}`;
  return { label, detail, branch, adoption };
}
