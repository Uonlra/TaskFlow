"use client";

import type { ReactNode } from "react";

import { ScrambleText } from "@/components/common/scramble-text";
import { TaskProgressRing } from "@/components/task/task-progress-ring";
import { TaskStatusLights, type TaskStatusLightItem } from "@/components/task/task-status-lights";
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
      helper: "正在推进，别同时开太多窗口。",
      tone: "info",
    },
    {
      label: "待开始",
      value: todoCount,
      helper: "还没动手，先挑最重要的一条。",
      tone: "neutral",
    },
    {
      label: "已完成",
      value: doneCount,
      helper: "已经收尾，可以安心划掉。",
      tone: "success",
    },
    {
      label: "需要盯住",
      value: overdueCount + todayCount,
      helper: overdueCount ? "有逾期任务，先救火。" : todayCount ? "今天到期，别拖太晚。" : "暂时没有红灯。",
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
              <strong>{total ? "这组任务已经收得很干净" : "还没有任务进入雷达"}</strong>
              <span>{total ? "可以复盘一下，或者放心切到下一组。" : "先加一条任务，系统就能开始帮你看节奏。"}</span>
            </>
          )}
        </div>

        {action ? <div className="task-signal-panel__action">{action}</div> : null}
      </div>

      <div className="task-signal-panel__visual">
        <TaskProgressRing
          value={completionRate}
          helper={total ? `${doneCount} / ${total} 条已完成` : "没有任务时，进度先归零。"}
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
