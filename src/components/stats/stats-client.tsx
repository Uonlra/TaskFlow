"use client";

import { useEffect, useMemo } from "react";

import type { DashboardTagTopItem } from "@/features/tasks/utils/task-analytics";
import { buildDashboardStats } from "@/features/tasks/utils/task-analytics";
import { useAuth } from "@/providers/auth-provider";
import { useTaskStore } from "@/store/task-store";

export function StatsClient() {
  const { user, isConfigured } = useAuth();
  const tasks = useTaskStore((state) => state.tasks);
  const isLoading = useTaskStore((state) => state.isLoading);
  const lastLoadedUserId = useTaskStore((state) => state.lastLoadedUserId);
  const syncTasks = useTaskStore((state) => state.syncTasks);

  useEffect(() => {
    if (isConfigured && user?.id && lastLoadedUserId !== user.id) {
      void syncTasks(user.id);
    }
  }, [isConfigured, lastLoadedUserId, syncTasks, user?.id]);

  const stats = useMemo(() => buildDashboardStats(tasks, { range: "all" }), [tasks]);

  return (
    <section className="stats-shell">
      <StatsOverview
        completionRate={stats.completionRate}
        completedCount={stats.completedCount}
        totalCount={stats.totalCount}
        overdueCount={stats.overdueCount}
        isLoading={isLoading}
      />
      <div className="stats-layout-grid">
        <StatsChartPlaceholder title="任务完成趋势" label="ECharts line option 预留" rows={stats.trend.map((point) => `${point.label} / ${point.completed}`)} />
        <StatsChartPlaceholder title="状态分布" label="ECharts pie option 预留" rows={stats.statusDistribution.map((item) => `${item.label} / ${item.count}`)} />
        <StatsChartPlaceholder title="优先级分布" label="ECharts bar option 预留" rows={stats.priorityDistribution.map((item) => `${item.label} / ${item.count}`)} />
        <StatsTagTop items={stats.tagTop} />
        <StatsRiskSummary rows={stats.overdueRisk.map((item) => `${item.label} / ${item.count}`)} />
      </div>
    </section>
  );
}

function StatsOverview({
  completionRate,
  completedCount,
  totalCount,
  overdueCount,
  isLoading,
}: {
  completionRate: number;
  completedCount: number;
  totalCount: number;
  overdueCount: number;
  isLoading: boolean;
}) {
  return (
    <section className="stats-overview card-surface">
      <article>
        <span>完成率</span>
        <strong>{isLoading ? "--" : `${completionRate}%`}</strong>
      </article>
      <article>
        <span>已完成</span>
        <strong>{isLoading ? "--" : `${completedCount}/${totalCount}`}</strong>
      </article>
      <article>
        <span>逾期风险</span>
        <strong>{isLoading ? "--" : overdueCount}</strong>
      </article>
    </section>
  );
}

function StatsChartPlaceholder({ title, label, rows }: { title: string; label: string; rows: string[] }) {
  return (
    <section className="stats-panel card-surface">
      <div className="stats-panel__head">
        <h2>{title}</h2>
        <span>{label}</span>
      </div>
      <div className="stats-placeholder-bars">
        {rows.map((row, index) => (
          <div key={row} className="stats-placeholder-row">
            <span>{row}</span>
            <i style={{ width: `${Math.max(18, 96 - index * 13)}%` }} />
          </div>
        ))}
      </div>
    </section>
  );
}

function StatsTagTop({ items }: { items: DashboardTagTopItem[] }) {
  return (
    <section className="stats-panel card-surface">
      <div className="stats-panel__head">
        <h2>标签 Top N</h2>
        <span>analytics 数据映射</span>
      </div>
      <div className="stats-placeholder-bars">
        {items.length ? (
          items.map((item) => (
            <div key={item.tag} className="stats-placeholder-row">
              <span>{item.tag}</span>
              <i style={{ width: `${item.ratio}%`, background: item.color }} />
            </div>
          ))
        ) : (
          <p className="stats-empty">暂无标签数据</p>
        )}
      </div>
    </section>
  );
}

function StatsRiskSummary({ rows }: { rows: string[] }) {
  return (
    <section className="stats-panel card-surface">
      <div className="stats-panel__head">
        <h2>逾期风险</h2>
        <span>risk model 预留</span>
      </div>
      <div className="stats-risk-list">
        {rows.map((row) => (
          <article key={row}>
            <span />
            <strong>{row}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}
