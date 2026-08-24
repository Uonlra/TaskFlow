"use client";

import type { CSSProperties } from "react";
import Link from "next/link";

import { TaskFormDialog } from "@/features/tasks/components/task-form-dialog";
import type { TaskFormValues } from "@/features/tasks/schemas/task-schema";
import type { Task } from "@/features/tasks/types/task.types";
import type { DashboardStats, DashboardTaskPreview } from "@/features/tasks/utils/task-analytics";
import { parseTaskDueDateValue } from "@/features/tasks/utils/task-date-filters";
import { ROUTES } from "@/shared/lib/constants/routes";

type MobileDashboardRange = "today" | "week" | "all";

type MobileDashboardOverviewProps = {
  stats: DashboardStats;
  range: MobileDashboardRange;
  rangeLabel: string;
  isLoading: boolean;
  onRangeChange: (range: MobileDashboardRange) => void;
  onCreateTask: (values: TaskFormValues) => void | Promise<void>;
  onPreviewTask: (task: DashboardTaskPreview) => void;
};

const rangeOptions: Array<{ value: MobileDashboardRange; label: string }> = [
  { value: "today", label: "今天" },
  { value: "week", label: "本周" },
  { value: "all", label: "全部" },
];

const priorityLabel: Record<Task["priority"], string> = {
  high: "高",
  medium: "中",
  low: "低",
};

const statusLabel: Record<Task["status"], string> = {
  todo: "待办",
  in_progress: "进行中",
  done: "完成",
};

export function MobileDashboardOverview({
  stats,
  range,
  rangeLabel,
  isLoading,
  onRangeChange,
  onCreateTask,
  onPreviewTask,
}: MobileDashboardOverviewProps) {
  const focusTasks = stats.focusTasks.slice(0, 4);
  const timelineTasks = stats.upcomingDeadlines.slice(0, 5);
  const projectEntries = stats.tagTop.slice(0, 4).map((item) => ({ tag: item.tag, count: item.count }));
  const dateLabel = new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date());

  return (
    <section className="mobile-dashboard" aria-label="移动端任务总览">
      <header className="mobile-page-header mobile-dashboard__header">
        <div className="mobile-page-header__copy">
          <p className="mobile-dashboard__date">{dateLabel}</p>
          <h1>今日</h1>
        </div>
        <TaskFormDialog
          onSubmitTask={onCreateTask}
          triggerLabel="新增"
          triggerAriaLabel="新增任务"
          triggerIconOnly
          triggerClassName="mobile-add-task-button tesla-action tesla-action--primary"
        />
      </header>

      <div className="mobile-dashboard__range date-switcher" aria-label="切换统计范围">
        {rangeOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={range === option.value}
            className={
              range === option.value
                ? "mobile-dashboard__range-button date-switcher__button is-active"
                : "mobile-dashboard__range-button date-switcher__button"
            }
            onClick={() => onRangeChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <section className="mobile-dashboard__progress-card" aria-label={`${rangeLabel}任务进度`}>
        <div
          className="mobile-dashboard__progress-ring"
          style={{ "--mobile-progress": `${stats.completionRate * 3.6}deg` } as CSSProperties}
          aria-hidden="true"
        >
          <span>{stats.completionRate}%</span>
        </div>
        <div className="mobile-dashboard__progress-copy">
          <p>{rangeLabel}进度</p>
          <h2>
            {stats.completedCount}/{stats.totalCount || 0}
          </h2>
          <span>{isLoading ? "同步中" : "已完成"}</span>
        </div>
      </section>

      <div className="mobile-dashboard__metric-grid" aria-label="任务统计">
        <MetricCard label="待办" value={stats.activeCount} tone="neutral" />
        <MetricCard label="进行中" value={stats.inProgressCount} tone="blue" />
        <MetricCard label="高优先" value={stats.highPriorityActiveCount} tone="red" />
        <MetricCard label="今日到期" value={stats.dueTodayCount} tone="amber" />
      </div>

      <section className="mobile-dashboard__section">
        <div className="mobile-dashboard__section-head">
          <h2>优先提醒</h2>
          <span>{stats.overdueCount > 0 ? `${stats.overdueCount} 逾期` : `${stats.upcomingCount} 近期`}</span>
        </div>
        <div className="mobile-dashboard__task-stack">
          {focusTasks.length ? (
            focusTasks.map((task) => <MobileTaskRow key={task.id} task={task} onPreviewTask={onPreviewTask} />)
          ) : (
            <p className="mobile-dashboard__empty mobile-empty-state">暂无待处理任务</p>
          )}
        </div>
      </section>

      <section className="mobile-dashboard__section">
        <div className="mobile-dashboard__section-head">
          <h2>时间线</h2>
          <Link href={ROUTES.tasks}>全部</Link>
        </div>
        <div className="mobile-dashboard__timeline">
          {timelineTasks.length ? (
            timelineTasks.map((task) => <TimelineItem key={task.id} task={task} onPreviewTask={onPreviewTask} />)
          ) : (
            <p className="mobile-dashboard__empty mobile-empty-state">没有临近日程</p>
          )}
        </div>
      </section>

      <section className="mobile-dashboard__section">
        <div className="mobile-dashboard__section-head">
          <h2>项目</h2>
          <span>{projectEntries.length}</span>
        </div>
        <div className="mobile-dashboard__project-grid">
          {projectEntries.length ? (
            projectEntries.map((item) => (
              <Link
                key={item.tag}
                href={`${ROUTES.tasks}?tag=${encodeURIComponent(item.tag)}`}
                className="mobile-dashboard__project-card"
              >
                <span>{item.tag.slice(0, 1).toUpperCase()}</span>
                <strong>{item.tag}</strong>
                <small>{item.count} 项</small>
              </Link>
            ))
          ) : (
            <p className="mobile-dashboard__empty mobile-empty-state">暂无项目标签</p>
          )}
        </div>
      </section>
    </section>
  );
}

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "neutral" | "blue" | "red" | "amber";
}) {
  return (
    <article className={`mobile-dashboard__metric mobile-dashboard__metric--${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function MobileTaskRow({
  task,
  onPreviewTask,
}: {
  task: DashboardTaskPreview;
  onPreviewTask: (task: DashboardTaskPreview) => void;
}) {
  return (
    <button
      type="button"
      className={`mobile-dashboard__task-row mobile-dashboard__task-row--${task.priority}`}
      onClick={() => onPreviewTask(task)}
    >
      <span className="mobile-dashboard__task-status" aria-hidden="true" />
      <span className="mobile-dashboard__task-copy">
        <strong>{task.title}</strong>
        <small>{task.dueLabel}</small>
      </span>
      <span className="mobile-dashboard__task-priority">{priorityLabel[task.priority]}</span>
    </button>
  );
}

function TimelineItem({
  task,
  onPreviewTask,
}: {
  task: DashboardTaskPreview;
  onPreviewTask: (task: DashboardTaskPreview) => void;
}) {
  return (
    <button type="button" className="mobile-dashboard__timeline-item" onClick={() => onPreviewTask(task)}>
      <time>{formatShortDate(task.dueDate)}</time>
      <span>
        <strong>{task.title}</strong>
        <small>{statusLabel[task.status]}</small>
      </span>
    </button>
  );
}

function formatShortDate(value: string | undefined) {
  if (!value) {
    return "--";
  }

  const date = parseTaskDueDateValue(value);

  if (!date) {
    return value;
  }

  return `${date.getMonth() + 1}/${date.getDate()}`;
}
