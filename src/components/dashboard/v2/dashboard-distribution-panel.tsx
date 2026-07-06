import type { EChartsOption } from "echarts";

import { EChartsClient } from "@/components/charts/echarts-client";
import type {
  DashboardDistributionItem,
  DashboardTagTopItem,
} from "@/features/tasks/utils/task-analytics";
import type { TaskPriority, TaskStatus } from "@/features/tasks/types/task.types";
import { buildTasksHref } from "@/lib/constants/query-params";

type DashboardDistributionPanelProps = {
  statusDistribution: Array<DashboardDistributionItem<TaskStatus>>;
  priorityDistribution: Array<DashboardDistributionItem<TaskPriority>>;
  tagTop: DashboardTagTopItem[];
  isEmpty?: boolean;
};

export function DashboardDistributionPanel({
  statusDistribution,
  priorityDistribution,
  tagTop,
  isEmpty = false,
}: DashboardDistributionPanelProps) {
  return (
    <section className="dashboard-v2-distribution-grid">
      <StatusDistributionCard items={statusDistribution} isEmpty={isEmpty} />
      <PriorityDistributionCard items={priorityDistribution} isEmpty={isEmpty} />
      <TagTopCard items={tagTop} isEmpty={isEmpty} />
    </section>
  );
}

function StatusDistributionCard({
  items,
  isEmpty = false,
}: {
  items: Array<DashboardDistributionItem<TaskStatus>>;
  isEmpty?: boolean;
}) {
  const hasData = !isEmpty && items.some((item) => item.count > 0);
  const option = buildStatusOption(items);

  return (
    <article className="dashboard-v2-panel dashboard-v2-distribution-card">
      <div className="dashboard-v2-panel__head">
        <h2>任务状态分布</h2>
      </div>
      {hasData ? (
        <EChartsClient
          className="dashboard-v2-echart dashboard-v2-echart--compact"
          ariaLabel="任务状态分布图"
          option={option}
          getClickHref={(params) => {
            const item = findDistributionItemByChartName(items, params);
            return item ? buildTasksHref({ status: item.value }) : undefined;
          }}
        />
      ) : (
        <DashboardV2EmptyBlock label="暂无状态" />
      )}
    </article>
  );
}

function PriorityDistributionCard({
  items,
  isEmpty = false,
}: {
  items: Array<DashboardDistributionItem<TaskPriority>>;
  isEmpty?: boolean;
}) {
  const hasData = !isEmpty && items.some((item) => item.count > 0);
  const option = buildPriorityOption(items);

  return (
    <article className="dashboard-v2-panel dashboard-v2-distribution-card">
      <div className="dashboard-v2-panel__head">
        <h2>优先级分布</h2>
      </div>
      {hasData ? (
        <EChartsClient
          className="dashboard-v2-echart dashboard-v2-echart--compact"
          ariaLabel="任务优先级分布图"
          option={option}
          getClickHref={(params) => {
            const item = findDistributionItemByChartName(items, params);
            return item ? buildTasksHref({ priority: item.value }) : undefined;
          }}
        />
      ) : (
        <DashboardV2EmptyBlock label="暂无优先级" />
      )}
    </article>
  );
}

function TagTopCard({ items, isEmpty = false }: { items: DashboardTagTopItem[]; isEmpty?: boolean }) {
  const hasData = !isEmpty && items.length > 0;
  const option = buildTagTopOption(items);

  return (
    <article className="dashboard-v2-panel dashboard-v2-distribution-card">
      <div className="dashboard-v2-panel__head">
        <h2>标签 Top 5</h2>
      </div>
      {hasData ? (
        <EChartsClient
          className="dashboard-v2-echart dashboard-v2-echart--compact"
          ariaLabel="标签 Top 5 图"
          option={option}
          getClickHref={(params) => {
            const tag = getChartParamName(params);
            return tag ? buildTasksHref({ tag }) : undefined;
          }}
        />
      ) : (
        <DashboardV2EmptyBlock label="暂无标签" />
      )}
    </article>
  );
}

function buildStatusOption(items: Array<DashboardDistributionItem<TaskStatus>>): EChartsOption {
  return {
    color: items.map((item) => item.color),
    tooltip: buildTooltip(),
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

function buildPriorityOption(items: Array<DashboardDistributionItem<TaskPriority>>): EChartsOption {
  return {
    color: items.map((item) => item.color),
    tooltip: buildTooltip(),
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
          },
        })),
      },
    ],
  };
}

function buildTagTopOption(items: DashboardTagTopItem[]): EChartsOption {
  return {
    tooltip: buildTooltip(),
    grid: {
      top: 8,
      right: 16,
      bottom: 8,
      left: 48,
    },
    xAxis: {
      type: "value",
      show: false,
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

function buildTooltip() {
  return {
    trigger: "item",
    backgroundColor: "rgba(255,255,255,0.96)",
    borderColor: "rgba(226,232,240,0.9)",
    borderWidth: 1,
    textStyle: {
      color: "#111827",
      fontSize: 12,
    },
  } as const;
}

function findDistributionItemByChartName<TValue extends string>(
  items: Array<DashboardDistributionItem<TValue>>,
  params: unknown,
) {
  const name = getChartParamName(params);
  return items.find((item) => item.label === name || item.label.replace("优先级", "") === name);
}

function getChartParamName(params: unknown) {
  if (!params || typeof params !== "object" || !("name" in params)) {
    return "";
  }

  const name = (params as { name?: unknown }).name;

  return typeof name === "string" ? name : "";
}

function DashboardV2EmptyBlock({ label }: { label: string }) {
  return (
    <div className="dashboard-v2-empty-block">
      <span />
      <p>{label}</p>
    </div>
  );
}
