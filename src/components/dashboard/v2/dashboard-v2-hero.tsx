import Link from "next/link";

import { DashboardAtmosphereLayer } from "@/components/dashboard/v2/dashboard-atmosphere-layer";
import type { DashboardStats } from "@/features/tasks/utils/task-analytics";
import { buildTasksHref } from "@/lib/constants/query-params";

type DashboardV2HeroProps = {
  stats: DashboardStats;
  rangeLabel: string;
  isEmpty?: boolean;
  isAccountEmpty?: boolean;
  isSyncing?: boolean;
  isPreview?: boolean;
  totalTaskCount?: number;
};

export function DashboardV2Hero({
  stats,
  rangeLabel,
  isEmpty = false,
  isAccountEmpty = false,
  isSyncing = false,
  isPreview = false,
  totalTaskCount = 0,
}: DashboardV2HeroProps) {
  const todayLabel = new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).format(new Date());
  const title = getHeroTitle({ isAccountEmpty, isEmpty, isSyncing, rangeLabel });
  const description = getHeroDescription({
    activeCount: stats.activeCount,
    completionRate: stats.completionRate,
    isAccountEmpty,
    isEmpty,
    isSyncing,
    rangeLabel,
    totalTaskCount,
  });
  const statusLabel = isSyncing ? "同步中" : isPreview ? "预览数据" : isAccountEmpty ? "暂无任务" : "已同步";

  return (
    <section className={`dashboard-v2-hero${isEmpty ? " dashboard-v2-hero--empty" : ""}`}>
      <div className="dashboard-v2-hero__copy">
        <div className="dashboard-v2-hero__meta">
          <p className="dashboard-v2-kicker" suppressHydrationWarning>
            {todayLabel}
          </p>
          <span className="dashboard-v2-preview-badge">{statusLabel}</span>
        </div>
        <h1>{title}</h1>
        <p>{description}</p>
        <div className="dashboard-v2-hero__chips" aria-label="今日概览">
          <span>{stats.totalCount} 当前范围</span>
          <span>{totalTaskCount} 全部任务</span>
          <span>{stats.overdueCount} 逾期</span>
          <span>{stats.upcomingCount} 即将到期</span>
        </div>
        {isAccountEmpty ? (
          <Link className="dashboard-v2-hero__action" href={buildTasksHref()}>
            添加第一个任务
          </Link>
        ) : isEmpty ? (
          <Link className="dashboard-v2-hero__action" href={buildTasksHref()}>
            查看全部任务
          </Link>
        ) : null}
      </div>

      <div className="dashboard-v2-scene" aria-label="数据网络背景层">
        <DashboardAtmosphereLayer enabled variant="dom" />
        <div className="dashboard-v2-floating-card dashboard-v2-floating-card--completion">
          <span className="dashboard-v2-floating-card__icon" aria-hidden="true" />
          <div className="dashboard-v2-floating-card__body">
            <span>完成率</span>
            <strong>{isSyncing ? "--" : `${stats.completionRate}%`}</strong>
          </div>
          <span className="dashboard-v2-floating-card__spark" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
            <i />
          </span>
        </div>
        <div className="dashboard-v2-floating-card dashboard-v2-floating-card--progress">
          <span className="dashboard-v2-floating-card__icon dashboard-v2-floating-card__icon--purple" aria-hidden="true" />
          <div className="dashboard-v2-floating-card__body">
            <span>{rangeLabel}进度</span>
            <strong>{isSyncing ? "--" : `${stats.completedCount} / ${stats.totalCount}`}</strong>
          </div>
          <span className="dashboard-v2-floating-card__spark dashboard-v2-floating-card__spark--purple" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
            <i />
          </span>
        </div>
      </div>
    </section>
  );
}

function getHeroTitle(input: {
  isAccountEmpty: boolean;
  isEmpty: boolean;
  isSyncing: boolean;
  rangeLabel: string;
}) {
  if (input.isSyncing) {
    return `${input.rangeLabel}总览`;
  }

  if (input.isAccountEmpty) {
    return "开始规划今天";
  }

  if (input.isEmpty) {
    return `${input.rangeLabel}暂无任务`;
  }

  return `${input.rangeLabel}总览`;
}

function getHeroDescription(input: {
  activeCount: number;
  completionRate: number;
  isAccountEmpty: boolean;
  isEmpty: boolean;
  isSyncing: boolean;
  rangeLabel: string;
  totalTaskCount: number;
}) {
  if (input.isSyncing) {
    return "正在同步任务数据。";
  }

  if (input.isAccountEmpty) {
    return "先添加一个任务，趋势和风险会自动生成。";
  }

  if (input.isEmpty) {
    return `${input.rangeLabel}没有命中任务，全部任务 ${input.totalTaskCount} 项。`;
  }

  return `${input.activeCount} 项待处理，完成率 ${input.completionRate}%`;
}
