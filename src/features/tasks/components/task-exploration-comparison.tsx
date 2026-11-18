"use client";

import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { ArrowLeft, Check, Columns3 } from "lucide-react";
import type { TaskEvolution } from "@/features/tasks/types/task-evolution.types";
import { buildExplorationComparison } from "@/features/tasks/utils/task-exploration-comparison";
import { explorationStatusLabels } from "@/features/tasks/utils/task-evolution-presentation";
import { formatDateTime } from "./task-detail-sections";
import type { EvolutionFormIntent } from "./task-evolution-action-form";

type Props = {
  evolution: TaskEvolution;
  branchIds: string[];
  actionsDisabled: boolean;
  onOpen: (intent: EvolutionFormIntent) => void;
  onClose: () => void;
};

export function TaskExplorationComparison({ evolution, branchIds, actionsDisabled, onOpen, onClose }: Props) {
  const headingId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [versions, setVersions] = useState<Record<string, string>>({});
  const [choices, setChoices] = useState<Record<string, string[]>>({});
  useEffect(() => {
    headingRef.current?.focus();
  }, []);
  const columns = buildExplorationComparison(evolution, branchIds).map((column) => {
    const version = column.results.find((item) => item.result.id === versions[column.branch.id]) ?? column.results[0];
    const selected = (version ? (choices[version.result.id] ?? []) : []).filter((id) =>
      version?.availableIds.includes(id),
    );
    return { ...column, version, selected };
  });

  return (
    <section className="task-plan-comparison" aria-labelledby={headingId}>
      <header className="task-plan-comparison__heading">
        <div>
          <Columns3 size={18} aria-hidden="true" />
          <h2 ref={headingRef} tabIndex={-1} id={headingId}>
            方案对比
          </h2>
        </div>
        <button type="button" disabled={actionsDisabled} onClick={onClose}>
          <ArrowLeft size={14} aria-hidden="true" />
          返回演进
        </button>
      </header>
      {columns.length < 2 ? (
        <p className="task-evolution-muted">可用方案不足</p>
      ) : (
        <div
          className="task-plan-comparison__scroll"
          role="group"
          aria-label="方案对比表"
          tabIndex={0}
          data-lenis-prevent-wheel="true"
        >
          <table style={{ "--comparison-count": columns.length } as CSSProperties}>
            <caption className="visually-hidden">探索方案的目标依据、验证问题、执行进度和历史结论</caption>
            <thead>
              <tr>
                <th scope="col">方案</th>
                {columns.map(({ branch, needsReview }) => (
                  <th scope="col" key={branch.id}>
                    <strong>{branch.title}</strong>
                    <div className="task-plan-comparison__statuses">
                      <span>{explorationStatusLabels[branch.status]}</span>
                      {needsReview ? <span className="is-review">待检查</span> : null}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">目标依据</th>
                {columns.map(({ branch, goal }) => (
                  <td key={branch.id}>
                    <small>
                      V{branch.reviewedGoalVersion}
                      {branch.baseGoalVersion !== branch.reviewedGoalVersion
                        ? ` · 始于 V${branch.baseGoalVersion}`
                        : ""}
                    </small>
                    <p>{goal?.objective ?? "目标版本不可用"}</p>
                    <p className="task-evolution-muted">{goal?.successCriteria || "未设置完成标准"}</p>
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row">验证问题</th>
                {columns.map(({ branch }) => (
                  <td key={branch.id}>
                    <p>{branch.question}</p>
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row">执行进度</th>
                {columns.map(({ branch }) => (
                  <td key={branch.id}>
                    {branch.steps.length
                      ? `${branch.steps.filter((step) => step.done).length} / ${branch.steps.length} 项完成`
                      : "无执行步骤"}
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row">结论与成果</th>
                {columns.map(({ branch, results, version, canAdopt, selected }) => (
                  <td key={branch.id}>
                    {version ? (
                      <>
                        {results.length > 1 ? (
                          <select
                            aria-label={`${branch.title}的结论版本`}
                            value={version.result.id}
                            disabled={actionsDisabled}
                            onChange={(event) =>
                              setVersions((value) => ({ ...value, [branch.id]: event.target.value }))
                            }
                          >
                            {results.map((item) => (
                              <option key={item.result.id} value={item.result.id}>
                                结论 {item.version} · {item.result.summary}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <small>结论 {version.version}</small>
                        )}
                        <p className="task-plan-comparison__result-title">{version.result.summary}</p>
                        <small>
                          {formatDateTime(version.result.occurredAt)} · 目标 V{version.result.goalVersion}
                        </small>
                        {version.result.goalVersion !== evolution.goalVersion ? (
                          <p className="task-evolution-muted">旧目标下的结论</p>
                        ) : null}
                        <div
                          className="task-plan-comparison__points"
                          role="group"
                          aria-label={`${branch.title}成果条目`}
                          tabIndex={0}
                        >
                          {version.result.points.map((point) => (
                            <label key={point.id}>
                              {version.adoptedIds.has(point.id) ? (
                                <Check size={15} aria-hidden="true" />
                              ) : (
                                <input
                                  type="checkbox"
                                  checked={selected.includes(point.id)}
                                  disabled={actionsDisabled || !canAdopt}
                                  onChange={(event) =>
                                    setChoices((value) => ({
                                      ...value,
                                      [version.result.id]: event.target.checked
                                        ? [...(value[version.result.id] ?? []), point.id]
                                        : (value[version.result.id] ?? []).filter((id) => id !== point.id),
                                    }))
                                  }
                                />
                              )}
                              <span>
                                {point.text}
                                {version.adoptedIds.has(point.id) ? <small>已采纳</small> : null}
                              </span>
                            </label>
                          ))}
                        </div>
                        <small>
                          {version.adoptedIds.size}/{version.result.points.length} 项已采纳
                        </small>
                      </>
                    ) : (
                      <p className="task-evolution-muted">尚无结论</p>
                    )}
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row">采纳操作</th>
                {columns.map(({ branch, needsReview, version, selected }) => (
                  <td key={branch.id}>
                    {evolution.status === "done" ? (
                      <span className="task-evolution-muted">任务已完成</span>
                    ) : needsReview ? (
                      <button
                        type="button"
                        disabled={actionsDisabled}
                        onClick={() => onOpen({ type: "review_branch", branchId: branch.id })}
                      >
                        检查分支
                      </button>
                    ) : branch.status === "paused" ? (
                      <button
                        type="button"
                        disabled={actionsDisabled}
                        onClick={() => onOpen({ type: "set_branch_status", branchId: branch.id, status: "exploring" })}
                      >
                        恢复探索
                      </button>
                    ) : version && !version.availableIds.length ? (
                      <span className="task-evolution-muted">已全部采纳</span>
                    ) : (
                      <button
                        type="button"
                        className="task-plan-comparison__adopt"
                        disabled={actionsDisabled || !version || !selected.length}
                        onClick={() => {
                          if (version && selected.length)
                            onOpen({
                              type: "adopt_result",
                              branchId: branch.id,
                              resultId: version.result.id,
                              pointIds: selected,
                            });
                        }}
                      >
                        纳入主线{selected.length ? ` · ${selected.length}` : ""}
                      </button>
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
