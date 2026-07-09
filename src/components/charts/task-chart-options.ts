import type { EChartsOption } from "echarts";

import type {
  DashboardDistributionItem,
  DashboardTagTopItem,
  DashboardTrendPoint,
} from "@/features/tasks/utils/task-analytics";
import type { TaskPriority, TaskStatus } from "@/features/tasks/types/task.types";

export function buildTaskTrendOption(
  trend: DashboardTrendPoint[],
  options: { sparse?: boolean } = {},
): EChartsOption {
  const maxValue = Math.max(0, ...trend.flatMap((point) => [point.completed, point.created]));

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
      ...tooltipBase,
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
      max: maxValue <= 1 ? 2 : undefined,
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
        smooth: options.sparse ? false : 0.28,
        symbol: "circle",
        symbolSize: options.sparse ? 8 : 7,
        lineStyle: {
          width: 2.5,
        },
        areaStyle: options.sparse ? undefined : { color: "rgba(62,106,225,0.1)" },
        data: trend.map((point) => point.completed),
      },
      {
        name: "新增任务",
        type: "line",
        smooth: options.sparse ? false : 0.28,
        symbol: "circle",
        symbolSize: options.sparse ? 7 : 6,
        lineStyle: {
          width: 2,
        },
        data: trend.map((point) => point.created),
      },
    ],
  };
}

export function buildTaskStatusOption(items: Array<DashboardDistributionItem<TaskStatus>>): EChartsOption {
  return {
    color: items.map((item) => item.color),
    tooltip: {
      trigger: "item",
      ...tooltipBase,
    },
    series: [
      {
        name: "任务状态",
        type: "pie",
        radius: ["58%", "78%"],
        center: ["50%", "52%"],
        avoidLabelOverlap: true,
        label: {
          show: false,
        },
        emphasis: {
          scaleSize: 4,
        },
        data: items.map((item) => ({
          name: item.label,
          value: item.count,
        })),
      },
    ],
  };
}

export function buildTaskPriorityOption(items: Array<DashboardDistributionItem<TaskPriority>>): EChartsOption {
  return {
    color: items.map((item) => item.color),
    tooltip: {
      trigger: "item",
      ...tooltipBase,
    },
    grid: {
      top: 10,
      right: 8,
      bottom: 28,
      left: 28,
    },
    xAxis: {
      type: "category",
      data: items.map((item) => item.label.replace("优先级", "")),
      axisTick: {
        show: false,
      },
      axisLine: {
        lineStyle: {
          color: "#e5e7eb",
        },
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
        name: "任务数",
        type: "bar",
        barWidth: 22,
        itemStyle: {
          borderRadius: [6, 6, 2, 2],
        },
        data: items.map((item) => ({
          name: item.label.replace("优先级", ""),
          value: item.count,
          itemStyle: {
            color: item.color,
            opacity: item.count > 0 ? 1 : 0.24,
          },
        })),
      },
    ],
  };
}

export function buildTaskTagTopOption(items: DashboardTagTopItem[]): EChartsOption {
  const maxCount = Math.max(1, ...items.map((item) => item.count));

  return {
    tooltip: {
      trigger: "item",
      ...tooltipBase,
    },
    grid: {
      top: 8,
      right: 16,
      bottom: 8,
      left: 48,
    },
    xAxis: {
      type: "value",
      show: false,
      max: Math.max(3, maxCount + 1),
    },
    yAxis: {
      type: "category",
      inverse: true,
      data: items.map((item) => item.tag),
      axisTick: {
        show: false,
      },
      axisLine: {
        show: false,
      },
      axisLabel: {
        color: "#334155",
        fontSize: 12,
      },
    },
    series: [
      {
        name: "任务数",
        type: "bar",
        barWidth: 9,
        label: {
          show: true,
          position: "right",
          color: "#64748b",
          fontSize: 12,
        },
        itemStyle: {
          borderRadius: 999,
        },
        data: items.map((item) => ({
          name: item.tag,
          value: item.count,
          itemStyle: {
            color: item.color,
          },
        })),
      },
    ],
  };
}

const tooltipBase = {
  backgroundColor: "rgba(255,255,255,0.96)",
  borderColor: "rgba(226,232,240,0.9)",
  borderWidth: 1,
  textStyle: {
    color: "#111827",
    fontSize: 12,
  },
} as const;
