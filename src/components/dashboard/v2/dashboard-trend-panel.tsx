import Link from "next/link";
import type { EChartsOption } from "echarts";

import { EChartsClient } from "@/components/charts/echarts-client";
import type { DashboardTrendPoint } from "@/features/tasks/utils/task-analytics";
import { buildStatsHref } from "@/lib/constants/query-params";

type DashboardTrendPanelProps = {
  trend: DashboardTrendPoint[];
  isEmpty?: boolean;
};

export function DashboardTrendPanel({ trend, isEmpty = false }: DashboardTrendPanelProps) {
  const hasTrendData = !isEmpty && trend.some((point) => point.completed > 0 || point.created > 0);
  const option = buildTrendOption(trend);

  return (
    <section className="dashboard-v2-panel dashboard-v2-trend">
      <div className="dashboard-v2-panel__head">
        <h2>任务完成趋势</h2>
        <Link href={buildStatsHref({ range: "week" })}>近 7 天</Link>
      </div>
      {hasTrendData ? (
        <EChartsClient
          className="dashboard-v2-echart dashboard-v2-echart--trend"
          ariaLabel="任务完成趋势图"
          option={option}
        />
      ) : (
        <div className="dashboard-v2-empty-chart" aria-label="暂无趋势">
          <div className="dashboard-v2-empty-chart__grid">
            {trend.map((point, index) => (
              <span key={point.date} style={{ opacity: 0.35 + index * 0.07 }} />
            ))}
          </div>
          <div>
            <strong>暂无趋势</strong>
            <p>完成任务后显示</p>
          </div>
        </div>
      )}
    </section>
  );
}

function buildTrendOption(trend: DashboardTrendPoint[]): EChartsOption {
  return {
    color: ["#3e6ae1", "#aeb8c8"],
    grid: {
      top: 18,
      right: 18,
      bottom: 28,
      left: 34,
    },
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(255,255,255,0.96)",
      borderColor: "rgba(226,232,240,0.9)",
      borderWidth: 1,
      textStyle: {
        color: "#111827",
        fontSize: 12,
      },
    },
    legend: {
      top: 0,
      right: 0,
      itemWidth: 12,
      itemHeight: 8,
      textStyle: {
        color: "#64748b",
        fontSize: 12,
      },
    },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: trend.map((point) => point.label),
      axisLine: {
        lineStyle: {
          color: "#e5e7eb",
        },
      },
      axisTick: {
        show: false,
      },
      axisLabel: {
        color: "#64748b",
        fontSize: 12,
      },
    },
    yAxis: {
      type: "value",
      minInterval: 1,
      splitLine: {
        lineStyle: {
          color: "rgba(226,232,240,0.72)",
        },
      },
      axisLabel: {
        color: "#64748b",
        fontSize: 12,
      },
    },
    series: [
      {
        name: "完成任务",
        type: "line",
        smooth: true,
        symbolSize: 7,
        lineStyle: {
          width: 2.5,
        },
        areaStyle: {
          color: "rgba(62,106,225,0.1)",
        },
        data: trend.map((point) => point.completed),
      },
      {
        name: "新增任务",
        type: "line",
        smooth: true,
        symbolSize: 6,
        lineStyle: {
          width: 2,
        },
        data: trend.map((point) => point.created),
      },
    ],
  };
}
