"use client";

import Link from "next/link";
import type { EChartsOption } from "echarts";
import { useEffect } from "react";

import { useAuth } from "@/features/auth/providers/auth-provider";
import { useTaskStore } from "@/features/tasks/store/task-store";
import { buildTrendData } from "@/features/tasks/utils/task-analytics";
import { EChartsClient } from "@/shared/components/charts/echarts-client";
import { ROUTES } from "@/shared/lib/constants/routes";

const pulseOptionBase: EChartsOption = {
  animation: true,
  animationDuration: 360,
  animationDurationUpdate: 0,
  animationEasing: "cubicOut",
  grid: {
    top: 2,
    right: 8,
    bottom: 2,
    left: 38,
  },
  tooltip: {
    trigger: "axis",
    confine: true,
    backgroundColor: "#1f2937",
    borderWidth: 0,
    textStyle: {
      color: "#ffffff",
      fontSize: 11,
    },
    axisPointer: {
      type: "line",
      lineStyle: {
        color: "rgba(62,106,225,0.28)",
      },
    },
  },
  xAxis: {
    type: "value",
    min: 0,
    minInterval: 1,
    splitNumber: 2,
    axisLine: {
      lineStyle: {
        color: "#e5e7eb",
      },
    },
    axisTick: {
      show: false,
    },
    axisLabel: {
      color: "#94a3b8",
      fontSize: 9,
    },
    splitLine: {
      lineStyle: {
        color: "rgba(226,232,240,0.68)",
      },
    },
  },
  yAxis: {
    type: "category",
    inverse: true,
    axisLine: {
      show: false,
    },
    axisTick: {
      show: false,
    },
    axisLabel: {
      color: "#64748b",
      fontSize: 9,
      margin: 8,
    },
  },
  series: [
    {
      name: "完成量轨迹",
      type: "bar",
      barWidth: 2,
      barCategoryGap: "44%",
      itemStyle: {
        color: "#b9c8f4",
        borderRadius: [0, 2, 2, 0],
      },
      z: 1,
    },
    {
      name: "完成任务",
      type: "scatter",
      symbol: "circle",
      symbolSize: 8,
      itemStyle: {
        color: "#3e6ae1",
        borderColor: "#ffffff",
        borderWidth: 1.5,
      },
      z: 2,
    },
  ],
};

export function SidebarTaskPulse() {
  const { user, isLoading: isAuthLoading, isConfigured } = useAuth();
  const tasks = useTaskStore((state) => state.tasks);
  const isLoading = useTaskStore((state) => state.isLoading);
  const lastLoadedUserId = useTaskStore((state) => state.lastLoadedUserId);
  const syncTasks = useTaskStore((state) => state.syncTasks);
  const userId = user?.id;

  useEffect(() => {
    if (isConfigured && !isAuthLoading && !isLoading && userId && lastLoadedUserId !== userId) {
      void syncTasks(userId);
    }
  }, [isAuthLoading, isConfigured, isLoading, lastLoadedUserId, syncTasks, userId]);

  const completedTrend = buildTrendData(tasks, { days: 10 });
  const completedTotal = completedTrend.reduce((total, point) => total + point.completed, 0);
  const isTrendReady = !isAuthLoading && (!userId || lastLoadedUserId === userId) && !isLoading;
  const option: EChartsOption = {
    ...pulseOptionBase,
    xAxis: {
      ...(pulseOptionBase.xAxis as object),
      max: Math.max(2, ...completedTrend.map((point) => point.completed)),
    },
    yAxis: {
      ...(pulseOptionBase.yAxis as object),
      data: completedTrend.map((point) => point.label),
    },
    series: [
      {
        ...(pulseOptionBase.series as Array<Record<string, unknown>>)[0],
        data: completedTrend.map((point) => point.completed),
      },
      {
        ...(pulseOptionBase.series as Array<Record<string, unknown>>)[1],
        data: completedTrend.map((point) => [point.completed, point.label]),
      },
    ],
  };

  return (
    <Link className="dashboard-sidebar-pulse" href={ROUTES.stats} aria-label="查看最近十天的任务完成趋势">
      <div className="dashboard-sidebar-pulse__head">
        <span>最近 10 天完成数</span>
        <strong>{isTrendReady ? completedTotal : "--"}</strong>
      </div>
      {isTrendReady && tasks.length ? (
        <EChartsClient className="dashboard-sidebar-pulse__chart" ariaLabel="最近十天任务完成趋势图" option={option} />
      ) : (
        <span className="dashboard-sidebar-pulse__empty">{isTrendReady ? "完成任务后显示趋势" : "正在同步任务"}</span>
      )}
    </Link>
  );
}
