"use client";

import type { ReactNode } from "react";

import { ScrambleText } from "@/shared/components/common/scramble-text";
import { TaskProgressRing } from "@/features/tasks/components/task-progress-ring";
import { TaskStatusLights, type TaskStatusLightItem } from "@/features/tasks/components/task-status-lights";
import type { Task, TaskPriority } from "@/features/tasks/types/task.types";
import { getTaskDueMeta } from "@/features/tasks/utils/task-deadline";

type TaskSignalPanelProps = {
  tasks: Task[];
  eyebrow: string;
  title: string;
  description: string;
  activeLabel: string;
  variant?: "dashboard" | "tasks" | "demo";
  action?: ReactNode;
};

const priorityScore: Record<TaskPriority, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

export function TaskSignalPanel({
  tasks,
  eyebrow,
  title,
  description,
  activeLabel,
  variant = "dashboard",
  action,
}: TaskSignalPanelProps) {
  const total = tasks.length;
  const todoCount = tasks.filter((task) => task.status === "todo").length;
  const inProgressCount = tasks.filter((task) => task.status === "in_progress").length;
  const doneCount = tasks.filter((task) => task.status === "done").length;
  const overdueCount = tasks.filter((task) => getTaskDueMeta(task).isOverdue).length;
  const todayCount = tasks.filter((task) => getTaskDueMeta(task).isDueToday).length;
  const completionRate = total ? Math.round((doneCount / total) * 100) : 0;
  const focusTask = pickFocusTask(tasks);
  const focusDueMeta = focusTask ? getTaskDueMeta(focusTask) : null;
  const lights: TaskStatusLightItem[] = [
    {
      label: "进行中",
      value: inProgressCount,
      helper: "当前推进",
      tone: "info",
    },
    {
      label: "待开始",
      value: todoCount,
      helper: "待处理",
      tone: "neutral",
    },
    {
      label: "已完成",
      value: doneCount,
      helper: "已完成",
      tone: "success",
    },
    {
      label: "需要盯住",
      value: overdueCount + todayCount,
      helper: overdueCount ? "存在逾期" : todayCount ? "今日到期" : "无风险",
      tone: overdueCount ? "danger" : todayCount ? "warning" : "neutral",
      active: overdueCount + todayCount > 0,
    },
  ];

  return (
    <section className={`task-signal-panel task-signal-panel--${variant} card-surface`}>
      <div className="task-signal-panel__copy">
        <div>
          <p className="section-eyebrow panel-eyebrow">{eyebrow}</p>
          <h2 className="task-signal-panel__title">
            <ScrambleText text={title} playKey={`${variant}-${activeLabel}-${total}-${doneCount}`} />
          </h2>
          <p className="task-signal-panel__description">{description}</p>
        </div>

        <div className="task-signal-panel__focus" aria-label="今日优先处理">
          <span className="task-signal-panel__focus-kicker">{activeLabel}</span>
          {focusTask ? (
            <>
              <strong>{focusTask.title}</strong>
              <span>{focusDueMeta?.label ?? "先把它放到眼前。"}</span>
            </>
          ) : (
            <>
              <strong>{total ? "无待办任务" : "暂无任务"}</strong>
              <span>{total ? "当前范围已清空" : "新建任务后显示"}</span>
            </>
          )}
        </div>

        {action ? <div className="task-signal-panel__action">{action}</div> : null}
      </div>

      <div className="task-signal-panel__visual">
        <TaskProgressRing
          value={completionRate}
          helper={total ? `${doneCount} / ${total} 条已完成` : "暂无任务"}
        />
        <TaskStatusLights items={lights} />
      </div>
    </section>
  );
}

function pickFocusTask(tasks: Task[]) {
  return [...tasks]
    .filter((task) => task.status !== "done")
    .sort((left, right) => {
      const dueDiff = getTaskDueMeta(left).sortWeight - getTaskDueMeta(right).sortWeight;

      if (dueDiff !== 0) {
        return dueDiff;
      }

      const priorityDiff = priorityScore[right.priority] - priorityScore[left.priority];

      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      return new Date(right.updatedAt ?? right.createdAt).getTime() - new Date(left.updatedAt ?? left.createdAt).getTime();
    })[0];
}

