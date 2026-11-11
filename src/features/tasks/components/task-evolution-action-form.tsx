"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  taskEvolutionCommandSchema,
  type TaskEvolutionAction,
  type TaskEvolutionCommand,
} from "@/features/tasks/schemas/task-evolution-schema";
import { evolutionActionLabels } from "@/features/tasks/utils/task-evolution-presentation";
export { evolutionActionLabels } from "@/features/tasks/utils/task-evolution-presentation";
import type { Task } from "@/features/tasks/types/task.types";
import type { ExplorationBranch } from "@/features/tasks/types/task-evolution.types";

export type EvolutionFormIntent =
  | { type: "create_branch" | "adjust_goal" | "complete" | "reopen" }
  | { type: "record_progress"; branchId?: string }
  | { type: "submit_result" | "review_branch" | "add_step"; branchId: string }
  | { type: "set_branch_status"; branchId: string; status: ExplorationBranch["status"] }
  | { type: "set_step_done"; branchId: string; stepId: string; done: boolean }
  | { type: "adopt_result"; branchId: string; resultId: string }
  | { type: "withdraw_adoption"; adoptionId: string };

export function TaskEvolutionActionForm({
  task,
  intent,
  onExecute,
  onCancel,
  onSuccess,
  onReload,
}: {
  task: Task;
  intent: EvolutionFormIntent;
  onExecute: (command: TaskEvolutionCommand) => Promise<Task>;
  onCancel: () => void;
  onSuccess: (task: Task) => void;
  onReload?: () => Promise<void>;
}) {
  // Keep the version and source used to compose this draft, even if props refresh.
  const [baseline] = useState(task);
  const [objective, setObjective] = useState(baseline.evolution?.goal.objective ?? baseline.title);
  const [criteria, setCriteria] = useState(baseline.evolution?.goal.successCriteria ?? "");
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [reason, setReason] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [status, setStatus] = useState<ExplorationBranch["status"]>(
    intent.type === "set_branch_status" ? intent.status : "exploring",
  );
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const savingRef = useRef(false);
  const retry = useRef<{ signature: string; command: TaskEvolutionCommand } | null>(null);
  const headingId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    const first = formRef.current?.querySelector<HTMLElement>(
      "input:not([disabled]), textarea:not([disabled]), select:not([disabled])",
    );
    (first ?? formRef.current?.querySelector<HTMLElement>("h3"))?.focus();
  }, []);
  const result =
    intent.type === "adopt_result"
      ? baseline.evolution?.results.find((item) => item.id === intent.resultId)
      : undefined;
  const adoption =
    intent.type === "withdraw_adoption"
      ? baseline.evolution?.adoptions.find((item) => item.id === intent.adoptionId)
      : undefined;
  const branch =
    "branchId" in intent ? baseline.evolution?.branches.find((item) => item.id === intent.branchId) : undefined;
  const adoptedIds = new Set(
    baseline.evolution?.adoptions
      .filter((item) => item.resultId === result?.id && !item.withdrawnBy)
      .flatMap((item) => item.selectedPoints.map((point) => point.id)),
  );
  const stale =
    Boolean(task.evolution) !== Boolean(baseline.evolution) ||
    (task.evolution?.revision ?? 0) !== (baseline.evolution?.revision ?? 0) ||
    task.evolution?.goal.successCriteria !== baseline.evolution?.goal.successCriteria ||
    task.title !== baseline.title ||
    task.status !== baseline.status;
  const editsGoal = ["adopt_result", "adjust_goal", "withdraw_adoption"].includes(intent.type);
  const goal = { objective: objective.trim(), successCriteria: criteria.trim() };

  function buildAction(): TaskEvolutionAction {
    switch (intent.type) {
      case "create_branch":
        return { type: intent.type, title, question: detail };
      case "record_progress":
        return { ...intent, note: detail };
      case "add_step":
        return { ...intent, type: "add_step", title };
      case "set_step_done":
        return intent;
      case "submit_result":
        return {
          ...intent,
          type: "submit_result",
          summary: title,
          points: detail
            .split(/\r?\n/)
            .map((point) => point.trim())
            .filter(Boolean),
        };
      case "adjust_goal":
        return { type: intent.type, goal, reason };
      case "adopt_result":
        return { ...intent, pointIds: selected, reason, goal };
      case "review_branch":
        return { ...intent, type: "review_branch", reason };
      case "set_branch_status":
        return { ...intent, status, reason };
      case "withdraw_adoption":
        return { ...intent, reason, goal };
      case "complete":
        return { type: intent.type, note: reason };
      case "reopen":
        return { type: intent.type, reason };
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingRef.current) return;
    const parsed = taskEvolutionCommandSchema.safeParse({
      operationId: "draft",
      expectedRevision: baseline.evolution?.revision ?? 0,
      action: buildAction(),
    });
    if (!parsed.success) {
      setError(
        intent.type === "adopt_result" && !selected.length
          ? "请至少选择一项尚未采纳的成果。"
          : "请检查必填内容；成果条目最多 100 条。每项内容最多 10000 字。",
      );
      return;
    }
    const signature = JSON.stringify({ expectedRevision: parsed.data.expectedRevision, action: parsed.data.action });
    if (stale && retry.current?.signature !== signature) {
      setError("任务已有新记录，草稿已保留。请检查最新内容后关闭表单，再重新操作。");
      return;
    }
    if (retry.current?.signature !== signature)
      retry.current = { signature, command: { ...parsed.data, operationId: crypto.randomUUID() } };
    savingRef.current = true;
    setSaving(true);
    setError(null);
    try {
      onSuccess(await onExecute(retry.current.command));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "保存失败，草稿已保留，请重试。");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <form ref={formRef} className="task-evolution-form" onSubmit={submit} aria-labelledby={headingId}>
      <h3 id={headingId} tabIndex={-1}>
        {evolutionActionLabels[intent.type]}
      </h3>
      {branch ? <p className="task-evolution-muted">来源分支：{branch.title}</p> : null}
      {stale ? (
        <p role="status" className="task-evolution-notice">
          任务已有新记录。当前草稿仍基于打开表单时的内容，请检查后重新操作。
        </p>
      ) : null}
      <fieldset disabled={saving || refreshing}>
        {intent.type === "create_branch" ? (
          <>
            <FormField label="方案名称">
              <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={10000} />
            </FormField>
            <FormField label="验证问题">
              <textarea
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                required
                maxLength={10000}
                rows={3}
              />
            </FormField>
          </>
        ) : null}
        {intent.type === "add_step" ? (
          <FormField label="步骤名称">
            <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={10000} />
          </FormField>
        ) : null}
        {intent.type === "record_progress" ? (
          <FormField label="进展内容">
            <textarea
              autoFocus
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              required
              maxLength={10000}
              rows={4}
            />
          </FormField>
        ) : null}
        {intent.type === "submit_result" ? (
          <>
            <FormField label="结论摘要">
              <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={10000} />
            </FormField>
            <FormField label="成果条目（每行一项）">
              <textarea
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                required
                maxLength={10000}
                rows={5}
              />
            </FormField>
          </>
        ) : null}
        {intent.type === "adopt_result" ? (
          <>
            <p>
              <strong>{result?.summary}</strong>
            </p>
            <fieldset className="task-evolution-choices">
              <legend>选择要采纳的成果</legend>
              {result?.points.map((point) => (
                <label key={point.id}>
                  <input
                    type="checkbox"
                    checked={selected.includes(point.id)}
                    disabled={adoptedIds.has(point.id)}
                    onChange={(e) =>
                      setSelected((ids) =>
                        e.target.checked ? [...ids, point.id] : ids.filter((id) => id !== point.id),
                      )
                    }
                  />
                  <span>
                    {point.text}
                    {adoptedIds.has(point.id) ? <small> · 已采纳</small> : null}
                  </span>
                </label>
              ))}
            </fieldset>
            <p className="task-evolution-muted" aria-live="polite">
              已选 {selected.length} 项
            </p>
          </>
        ) : null}
        {intent.type === "review_branch" ? (
          <>
            <p className="task-evolution-muted">
              此前依据的目标：
              {
                baseline.evolution?.events.find((event) => event.goalVersion === branch?.reviewedGoalVersion)?.afterGoal
                  .objective
              }
            </p>
            <p className="task-evolution-muted">当前目标：{baseline.evolution?.goal.objective}</p>
          </>
        ) : null}
        {intent.type === "set_branch_status" ? (
          <FormField label="探索状态">
            <select value={status} onChange={(e) => setStatus(e.target.value as ExplorationBranch["status"])}>
              <option value="planned">待探索</option>
              <option value="exploring">探索中</option>
              <option value="ended">已结束</option>
              <option value="paused">已搁置</option>
            </select>
          </FormField>
        ) : null}
        {intent.type === "set_step_done" ? <p>将此步骤标记为{intent.done ? "已完成" : "未完成"}。</p> : null}
        {intent.type === "withdraw_adoption" ? (
          <>
            <p>撤回这次采纳，并确认主任务接下来使用的目标。原始记录会保留。</p>
            <ul>
              {adoption?.selectedPoints.map((point) => (
                <li key={point.id}>{point.text}</li>
              ))}
            </ul>
            {adoption ? (
              <button
                className="task-evolution-link"
                type="button"
                onClick={() => {
                  setObjective(adoption.beforeGoal.objective);
                  setCriteria(adoption.beforeGoal.successCriteria);
                }}
              >
                填入采纳前目标
              </button>
            ) : null}
          </>
        ) : null}
        {editsGoal ? (
          <>
            <FormField label="保存后的目标">
              <textarea
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                required
                maxLength={10000}
                rows={2}
              />
            </FormField>
            <FormField label="完成标准">
              <textarea value={criteria} onChange={(e) => setCriteria(e.target.value)} maxLength={10000} rows={2} />
            </FormField>
            <div className="task-evolution-comparison" aria-label="主任务变更预览">
              <div>
                <small>当前目标</small>
                <p>{baseline.title}</p>
                <p className="task-evolution-muted">{baseline.evolution?.goal.successCriteria || "尚未设置完成标准"}</p>
              </div>
              <div>
                <small>保存后</small>
                <p>{goal.objective || "请填写目标"}</p>
                <p className="task-evolution-muted">{goal.successCriteria || "尚未设置完成标准"}</p>
              </div>
            </div>
          </>
        ) : null}
        {intent.type === "complete" ? (
          <p>
            完成标准：<strong>{baseline.evolution?.goal.successCriteria}</strong>
          </p>
        ) : null}
        {!["create_branch", "record_progress", "submit_result", "add_step", "set_step_done"].includes(intent.type) ? (
          <FormField
            label={intent.type === "complete" ? "验收说明" : intent.type === "adopt_result" ? "选择理由" : "操作原因"}
          >
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} required maxLength={10000} rows={3} />
          </FormField>
        ) : null}
      </fieldset>
      {error ? (
        <p role="alert" className="task-evolution-error">
          {error}
        </p>
      ) : null}
      <div className="task-evolution-actions">
        <button type="submit" className="task-evolution-primary" disabled={saving || refreshing}>
          {saving ? "正在保存…" : intent.type === "adopt_result" ? "确认采纳并保存" : "保存记录"}
        </button>
        <button type="button" onClick={onCancel} disabled={saving || refreshing}>
          取消
        </button>
        {onReload && (error || stale) ? (
          <button
            type="button"
            disabled={saving || refreshing}
            onClick={async () => {
              setRefreshing(true);
              try {
                await onReload();
              } catch (cause) {
                setError(cause instanceof Error ? cause.message : "重新加载失败，草稿已保留。");
              } finally {
                setRefreshing(false);
              }
            }}
          >
            {refreshing ? "正在加载…" : "重新加载任务"}
          </button>
        ) : null}
      </div>
    </form>
  );
}

function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="task-evolution-field">
      <span>{label}</span>
      {children}
    </label>
  );
}
