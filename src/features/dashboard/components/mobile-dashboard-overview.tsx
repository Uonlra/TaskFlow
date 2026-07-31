"use client";

import type { CSSProperties } from "react";
import Link from "next/link";

import type { Task } from "@/features/tasks/types/task.types";
import { getTaskDueMeta } from "@/features/tasks/utils/task-deadline";
import { ROUTES } from "@/shared/lib/constants/routes";

type MobileDashboardRange = "today" | "week" | "all";

type MobileDashboardOverviewProps = {
  tasks: Task[];
  activeTasks: Task[];
  range: MobileDashboardRange;
  rangeLabel: string;
  completionRate: number;
  dueSummary: {
    overdue: number;
    today: number;
    upcoming: number;
  };
  isLoading: boolean;
  onRangeChange: (range: MobileDashboardRange) => void;
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
  tasks,
  activeTasks,
  range,
  rangeLabel,
  completionRate,
  dueSummary,
  isLoading,
  onRangeChange,
}: MobileDashboardOverviewProps) {
  const completedCount = tasks.filter((task) => task.status === "done").length;
  const inProgressCount = tasks.filter((task) => task.status === "in_progress").length;
  const highPriorityCount = activeTasks.filter((task) => task.priority === "high").length;
  const focusTasks = [...activeTasks]
    .sort((left, right) => {
      const priorityDiff = priorityScore(right.priority) - priorityScore(left.priority);

      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      return dateScore(left.dueDate) - dateScore(right.dueDate);
    })
    .slice(0, 4);
  const timelineTasks = [...activeTasks]
    .filter((task) => task.dueDate)
    .sort((left, right) => dateScore(left.dueDate) - dateScore(right.dueDate))
    .slice(0, 5);
  const projectEntries = buildProjectEntries(tasks);
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
        <Link href={ROUTES.tasks} className="mobile-dashboard__icon-button" aria-label="打开任务列表">
          <span aria-hidden="true" />
        </Link>
      </header>

      <div className="mobile-dashboard__range" aria-label="切换统计范围">
        {rangeOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={range === option.value}
            className={range === option.value ? "mobile-dashboard__range-button is-active" : "mobile-dashboard__range-button"}
            onClick={() => onRangeChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <section className="mobile-dashboard__progress-card" aria-label={`${rangeLabel}任务进度`}>
        <div
          className="mobile-dashboard__progress-ring"
          style={{ "--mobile-progress": `${completionRate * 3.6}deg` } as CSSProperties}
          aria-hidden="true"
        >
          <span>{completionRate}%</span>
        </div>
        <div className="mobile-dashboard__progress-copy">
          <p>{rangeLabel}进度</p>
          <h2>{completedCount}/{tasks.length || 0}</h2>
          <span>{isLoading ? "同步中" : "已完成"}</span>
        </div>
      </section>

      <div className="mobile-dashboard__metric-grid" aria-label="任务统计">
        <MetricCard label="待办" value={activeTasks.length} tone="neutral" />
        <MetricCard label="进行中" value={inProgressCount} tone="blue" />
        <MetricCard label="高优先" value={highPriorityCount} tone="red" />
        <MetricCard label="今日到期" value={dueSummary.today} tone="amber" />
      </div>

      <section className="mobile-dashboard__section">
        <div className="mobile-dashboard__section-head">
          <h2>优先提醒</h2>
          <span>{dueSummary.overdue > 0 ? `${dueSummary.overdue} 逾期` : `${dueSummary.upcoming} 近期`}</span>
        </div>
        <div className="mobile-dashboard__task-stack">
          {focusTasks.length ? (
            focusTasks.map((task) => <MobileTaskRow key={task.id} task={task} />)
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
            timelineTasks.map((task) => <TimelineItem key={task.id} task={task} />)
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
              <Link key={item.tag} href={`${ROUTES.tasks}?tag=${encodeURIComponent(item.tag)}`} className="mobile-dashboard__project-card">
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

function MetricCard({ label, value, tone }: { label: string; value: number; tone: "neutral" | "blue" | "red" | "amber" }) {
  return (
    <article className={`mobile-dashboard__metric mobile-dashboard__metric--${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function MobileTaskRow({ task }: { task: Task }) {
  const dueMeta = getTaskDueMeta(task);

  return (
    <Link href={`${ROUTES.tasks}/${task.id}`} className={`mobile-dashboard__task-row mobile-dashboard__task-row--${task.priority}`}>
      <span className="mobile-dashboard__task-status" aria-hidden="true" />
      <span className="mobile-dashboard__task-copy">
        <strong>{task.title}</strong>
        <small>{dueMeta.label}</small>
      </span>
      <span className="mobile-dashboard__task-priority">{priorityLabel[task.priority]}</span>
    </Link>
  );
}

function TimelineItem({ task }: { task: Task }) {
  return (
    <Link href={`${ROUTES.tasks}/${task.id}`} className="mobile-dashboard__timeline-item">
      <time>{formatShortDate(task.dueDate)}</time>
      <span>
        <strong>{task.title}</strong>
        <small>{statusLabel[task.status]}</small>
      </span>
    </Link>
  );
}

function buildProjectEntries(tasks: Task[]) {
  const counter = new Map<string, number>();

  tasks.forEach((task) => {
    task.tags.forEach((tag) => {
      counter.set(tag, (counter.get(tag) ?? 0) + 1);
    });
  });

  return Array.from(counter.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], "zh-CN"))
    .slice(0, 4)
    .map(([tag, count]) => ({ tag, count }));
}

function priorityScore(priority: Task["priority"]) {
  if (priority === "high") {
    return 3;
  }

  if (priority === "medium") {
    return 2;
  }

  return 1;
}

function dateScore(value: string | undefined) {
  if (!value) {
    return Number.MAX_SAFE_INTEGER;
  }

  const timestamp = new Date(value).getTime();

  return Number.isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp;
}

function formatShortDate(value: string | undefined) {
  if (!value) {
    return "--";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return `${date.getMonth() + 1}/${date.getDate()}`;
}
