import type { TaskEvolution, TaskEvolutionEvent } from "@/features/tasks/types/task-evolution.types";
import { describeEvolutionEvent, explorationStatusLabels } from "@/features/tasks/utils/task-evolution-presentation";

export function TaskEvolutionEventDetails({
  evolution,
  event,
}: {
  evolution: TaskEvolution;
  event: TaskEvolutionEvent;
}) {
  const { branch, adoption } = describeEvolutionEvent(evolution, event);
  const action = event.command?.action;
  const result = evolution.results.find((item) => item.id === event.id);
  const withdrawn =
    action?.type === "withdraw_adoption"
      ? evolution.adoptions.find((item) => item.id === action.adoptionId)
      : undefined;
  return (
    <div className="task-evolution-event-content">
      {branch ? <p>来源分支：{branch.title}</p> : null}
      {action && "note" in action ? <p>{action.note}</p> : null}
      {action && "reason" in action ? <p>原因：{action.reason}</p> : null}
      {action && "summary" in action ? <p>{action.summary}</p> : null}
      {action && "title" in action ? <p>{action.title}</p> : null}
      {action && "question" in action ? <p>验证问题：{action.question}</p> : null}
      {action?.type === "set_branch_status" ? <p>探索状态：{explorationStatusLabels[action.status]}</p> : null}
      {result ? (
        <ul>
          {result.points.map((point) => (
            <li key={point.id}>{point.text}</li>
          ))}
        </ul>
      ) : null}
      {adoption ? (
        <>
          <ul>
            {adoption.selectedPoints.map((point) => (
              <li key={point.id}>{point.text}</li>
            ))}
          </ul>
          <p className="task-evolution-muted">{adoption.withdrawnBy ? "已撤回" : "已采纳"}</p>
        </>
      ) : null}
      {withdrawn ? (
        <>
          <p>已撤回成果：</p>
          <ul>
            {withdrawn.selectedPoints.map((point) => (
              <li key={point.id}>{point.text}</li>
            ))}
          </ul>
        </>
      ) : null}
      {JSON.stringify(event.beforeGoal) !== JSON.stringify(event.afterGoal) ? (
        <div className="task-evolution-comparison">
          <div>
            <small>变更前</small>
            <p>{event.beforeGoal.objective}</p>
            <p>{event.beforeGoal.successCriteria || "尚未设置完成标准"}</p>
          </div>
          <div>
            <small>变更后</small>
            <p>{event.afterGoal.objective}</p>
            <p>{event.afterGoal.successCriteria || "尚未设置完成标准"}</p>
          </div>
        </div>
      ) : null}
      {event.kind === "baseline" ? (
        <>
          <p>{event.afterGoal.objective}</p>
          <p>{event.afterGoal.successCriteria || "尚未设置完成标准"}</p>
        </>
      ) : null}
    </div>
  );
}
