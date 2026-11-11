"use client";

import { useRef, useState } from "react";
import { GitBranch, GitMerge } from "lucide-react";
import { branchNeedsReview, getTaskExplorationSummary } from "@/features/tasks/domain/task-evolution";
import type { TaskEvolutionCommand } from "@/features/tasks/schemas/task-evolution-schema";
import type { Task } from "@/features/tasks/types/task.types";
import { formatDateTime, TaskDetailActivity } from "./task-detail-sections";
import { TaskEvolutionGraph } from "./task-evolution-graph";
import { TaskEvolutionActionForm, type EvolutionFormIntent } from "./task-evolution-action-form";
import type { TaskEvolutionTarget } from "@/features/tasks/utils/task-evolution-navigation";

const statusLabels = { planned: "待探索", exploring: "探索中", ended: "已结束", paused: "已搁置" };

export function TaskExplorationWorkspace({
  task,
  onExecute,
  onReload,
  initialTarget,
}: {
  task: Task;
  onExecute: (command: TaskEvolutionCommand) => Promise<Task>;
  onReload?: () => Promise<void>;
  initialTarget?: TaskEvolutionTarget;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(initialTarget?.branchId ?? null);
  const [form, setForm] = useState<{ key: string; intent: EvolutionFormIntent } | null>(() => {
    const intent = targetIntent(task, initialTarget);
    return intent ? { key: "initial", intent } : null;
  });
  const headingRef = useRef<HTMLHeadingElement>(null);
  const state = task.evolution;
  const branches = state?.branches ?? [];
  const branch = branches.find((item) => item.id === selectedId) ?? branches.at(-1);
  const summary = state ? getTaskExplorationSummary(state) : null;
  const needsReview = Boolean(state && branch && branchNeedsReview(state, branch));
  const done = task.status === "done";
  const editable = !done && !needsReview && (branch?.status === "planned" || branch?.status === "exploring");
  const results =
    state?.results
      .filter((item) => item.branchId === branch?.id)
      .slice()
      .reverse() ?? [];
  const open = (intent: EvolutionFormIntent) => setForm({ key: crypto.randomUUID(), intent });
  const canComplete = Boolean(state?.goal.successCriteria.trim() && summary?.activeBranches === 0);
  const closeForm = () => {
    setForm(null);
    requestAnimationFrame(() => headingRef.current?.focus());
  };

  return (
    <div className="task-evolution-workspace">
      {state ? (
        <TaskEvolutionGraph
          evolution={state}
          initialEventId={!initialTarget?.action ? initialTarget?.eventId : undefined}
          actionsDisabled={Boolean(form)}
          onSelectBranch={(branchId) => {
            setSelectedId(branchId);
            requestAnimationFrame(() => {
              headingRef.current?.focus();
              headingRef.current?.scrollIntoView({ block: "start" });
            });
          }}
          onWithdraw={(adoptionId) => open({ type: "withdraw_adoption", adoptionId })}
        />
      ) : (
        <TaskDetailActivity task={task} />
      )}
      <section className="task-exploration" aria-label="目标与探索" data-lenis-prevent-wheel="true">
        <header className="task-exploration-heading">
          <h2 ref={headingRef} tabIndex={-1}>
            目标与探索
          </h2>
          {summary && branches.length ? (
            <div className="task-exploration-counts task-evolution-muted">
              {summary.activeBranches ? (
                <span title="探索中">
                  <GitBranch size={14} aria-hidden="true" />
                  {summary.activeBranches}
                  <span className="visually-hidden"> 项探索中</span>
                </span>
              ) : null}
              {summary.pendingResults ? (
                <span title="待采纳">
                  <GitMerge size={14} aria-hidden="true" />
                  {summary.pendingResults}
                  <span className="visually-hidden"> 份结论待采纳</span>
                </span>
              ) : null}
            </div>
          ) : null}
        </header>
        {task.description ? <p className="task-exploration-description">{task.description}</p> : null}
        <div className="task-exploration-goal">
          <span className="task-evolution-muted">完成标准</span>
          <p>{state?.goal.successCriteria || "未设置"}</p>
        </div>
        <div className="task-evolution-actions">
          {!done ? (
            <>
              <button type="button" disabled={Boolean(form)} onClick={() => open({ type: "create_branch" })}>
                创建探索分支
              </button>
              <button type="button" disabled={Boolean(form)} onClick={() => open({ type: "record_progress" })}>
                记录主线进展
              </button>
              <button type="button" disabled={Boolean(form)} onClick={() => open({ type: "adjust_goal" })}>
                调整目标
              </button>
              <button
                type="button"
                disabled={Boolean(form) || !canComplete}
                title={
                  !state?.goal.successCriteria.trim()
                    ? "完成标准未设置"
                    : summary?.activeBranches
                      ? "仍有进行中的探索"
                      : undefined
                }
                onClick={() => open({ type: "complete" })}
              >
                验收完成
              </button>
            </>
          ) : (
            <button type="button" disabled={Boolean(form)} onClick={() => open({ type: "reopen" })}>
              重新打开任务
            </button>
          )}
        </div>
        {form ? (
          <TaskEvolutionActionForm
            key={form.key}
            task={task}
            intent={form.intent}
            onExecute={onExecute}
            onReload={onReload}
            onCancel={closeForm}
            onSuccess={(saved) => {
              if (form.intent.type === "create_branch") setSelectedId(saved.evolution?.branches.at(-1)?.id ?? null);
              closeForm();
            }}
          />
        ) : branches.length && branch ? (
          <div className="task-exploration-layout">
            <nav aria-label="探索分支" className="task-exploration-branches">
              {branches.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  data-status={item.status}
                  aria-pressed={item.id === branch.id}
                  onClick={() => setSelectedId(item.id)}
                >
                  <strong>{item.title}</strong>
                  <span>
                    {statusLabels[item.status]}
                    {state && branchNeedsReview(state, item) ? " · 待检查" : ""}
                  </span>
                </button>
              ))}
            </nav>
            <section className="task-exploration-branch" aria-label={`分支：${branch.title}`}>
              <header>
                <h3>{branch.title}</h3>
                <span className="task-evolution-muted">{statusLabels[branch.status]}</span>
              </header>
              <p className="task-evolution-muted">验证问题：{branch.question}</p>
              {needsReview ? (
                <div className="task-evolution-notice task-exploration-review">
                  <span>目标已更新</span>
                  {!done ? (
                    <button type="button" onClick={() => open({ type: "review_branch", branchId: branch.id })}>
                      检查此分支
                    </button>
                  ) : null}
                </div>
              ) : null}
              <div className="task-evolution-actions">
                {editable ? (
                  <>
                    <button
                      type="button"
                      className="task-evolution-primary"
                      onClick={() => open({ type: "submit_result", branchId: branch.id })}
                    >
                      提交结论
                    </button>
                    <button type="button" onClick={() => open({ type: "record_progress", branchId: branch.id })}>
                      记录分支进展
                    </button>
                    <button type="button" onClick={() => open({ type: "add_step", branchId: branch.id })}>
                      添加步骤
                    </button>
                  </>
                ) : null}
                {!done ? (
                  <button
                    type="button"
                    onClick={() =>
                      open({
                        type: "set_branch_status",
                        branchId: branch.id,
                        status:
                          branch.status === "planned" || branch.status === "paused" || branch.status === "ended"
                            ? "exploring"
                            : "ended",
                      })
                    }
                  >
                    调整探索状态
                  </button>
                ) : null}
              </div>
              {branch.steps.length ? (
                <ul className="task-exploration-steps" aria-label="执行步骤">
                  {branch.steps.map((step) => (
                    <li key={step.id}>
                      <span>
                        {step.done ? "✓ " : "○ "}
                        {step.title}
                      </span>
                      {editable ? (
                        <button
                          type="button"
                          className="task-evolution-link"
                          onClick={() =>
                            open({ type: "set_step_done", branchId: branch.id, stepId: step.id, done: !step.done })
                          }
                        >
                          {step.done ? "标记未完成" : "完成步骤"}
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
              <h4>成果结论 · {results.length}</h4>
              {results.length
                ? results.map((result, index) => {
                    const adopted = new Set(
                      state?.adoptions
                        .filter((item) => item.resultId === result.id && !item.withdrawnBy)
                        .flatMap((item) => item.selectedPoints.map((point) => point.id)),
                    );
                    return (
                      <details className="task-exploration-result" key={result.id} open={index === 0}>
                        <summary>
                          <strong>{result.summary}</strong>
                          <small>
                            {adopted.size}/{result.points.length} 项已采纳
                          </small>
                        </summary>
                        <time dateTime={result.occurredAt}>{formatDateTime(result.occurredAt)}</time>
                        <ul>
                          {result.points.map((point) => (
                            <li key={point.id}>
                              {point.text}
                              {adopted.has(point.id) ? <small> · 已采纳</small> : null}
                            </li>
                          ))}
                        </ul>
                        {!done && !needsReview && branch.status !== "paused" && adopted.size < result.points.length ? (
                          <button
                            type="button"
                            onClick={() => open({ type: "adopt_result", branchId: branch.id, resultId: result.id })}
                          >
                            选择成果并纳入主线
                          </button>
                        ) : null}
                      </details>
                    );
                  })
                : null}
            </section>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function targetIntent(task: Task, target?: TaskEvolutionTarget): EvolutionFormIntent | null {
  const state = task.evolution;
  if (!state || state.status === "done" || !target) return null;
  const branch = state.branches.find((item) => item.id === target.branchId);
  if (!branch) return null;
  if (target.action === "review" && branchNeedsReview(state, branch))
    return { type: "review_branch", branchId: branch.id };
  const result = state.results.find((item) => item.id === target.resultId && item.branchId === branch.id);
  if (target.action !== "adopt" || !result || branch.status === "paused" || branchNeedsReview(state, branch))
    return null;
  const adopted = new Set(
    state.adoptions
      .filter((item) => item.resultId === result.id && !item.withdrawnBy)
      .flatMap((item) => item.selectedPoints.map((point) => point.id)),
  );
  return result.points.some((point) => !adopted.has(point.id))
    ? { type: "adopt_result", branchId: branch.id, resultId: result.id }
    : null;
}
