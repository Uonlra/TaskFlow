import Link from "next/link";

import { DashboardAtmosphereLayer } from "@/components/dashboard/v2/dashboard-atmosphere-layer";
import type { DashboardStats } from "@/features/tasks/utils/task-analytics";
import { buildTasksHref } from "@/lib/constants/query-params";

type DashboardV2HeroProps = {
  stats: DashboardStats;
  rangeLabel: string;
  isEmpty?: boolean;
  isPreview?: boolean;
};

export function DashboardV2Hero({ stats, rangeLabel, isEmpty = false, isPreview = false }: DashboardV2HeroProps) {
  const todayLabel = new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).format(new Date());

  return (
    <section className="dashboard-v2-hero">
      <div className="dashboard-v2-hero__copy">
        <div className="dashboard-v2-hero__meta">
          <p className="dashboard-v2-kicker" suppressHydrationWarning>
            {todayLabel}
          </p>
          {isPreview ? <span className="dashboard-v2-preview-badge">预览数据</span> : null}
        </div>
        <h1>{isEmpty ? "开始规划今天" : `${rangeLabel}总览`}</h1>
        <p>{isEmpty ? "先添加一个任务，趋势和风险会自动生成。" : `${stats.activeCount} 项待处理，完成率 ${stats.completionRate}%`}</p>
        <div className="dashboard-v2-hero__chips" aria-label="今日概览">
          <span>{stats.totalCount} 总任务</span>
          <span>{stats.overdueCount} 逾期</span>
          <span>{stats.upcomingCount} 即将到期</span>
        </div>
        {isEmpty ? (
          <Link className="dashboard-v2-hero__action" href={buildTasksHref()}>
            添加第一个任务
          </Link>
        ) : null}
      </div>

      <div className="dashboard-v2-scene" aria-label="数据网络背景层">
        <DashboardAtmosphereLayer enabled variant="dom" />
        <div className="dashboard-v2-floating-card">
          <span>完成率</span>
          <strong>{stats.completionRate}%</strong>
        </div>
        <div className="dashboard-v2-floating-card dashboard-v2-floating-card--secondary">
          <span>高优先级</span>
          <strong>{stats.priorityDistribution.find((item) => item.value === "high")?.count ?? 0}</strong>
        </div>
        <div className="dashboard-v2-floating-card dashboard-v2-floating-card--tertiary">
          <span>风险</span>
          <strong>{stats.overdueCount}</strong>
        </div>
      </div>
    </section>
  );
}
