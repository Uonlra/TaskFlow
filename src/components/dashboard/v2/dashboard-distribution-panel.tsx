import { EChartsClient } from "@/components/charts/echarts-client";
import {
  buildTaskPriorityOption,
  buildTaskStatusOption,
  buildTaskTagTopOption,
} from "@/components/charts/task-chart-options";
import type {
  DashboardAnalyticsRange,
  DashboardDistributionItem,
  DashboardTagTopItem,
} from "@/features/tasks/utils/task-analytics";
import type { TaskPriority, TaskStatus } from "@/features/tasks/types/task.types";
import { buildTasksHref } from "@/lib/constants/query-params";

type DashboardDistributionPanelProps = {
  statusDistribution: Array<DashboardDistributionItem<TaskStatus>>;
  priorityDistribution: Array<DashboardDistributionItem<TaskPriority>>;
  tagTop: DashboardTagTopItem[];
  range: DashboardAnalyticsRange;
  rangeLabel: string;
  isEmpty?: boolean;
};

export function DashboardDistributionPanel({
  statusDistribution,
  priorityDistribution,
  tagTop,
  range,
  rangeLabel,
  isEmpty = false,
}: DashboardDistributionPanelProps) {
  return (
    <section className="dashboard-v2-distribution-grid">
      <StatusDistributionCard items={statusDistribution} rangeLabel={rangeLabel} isEmpty={isEmpty} />
      <PriorityDistributionCard items={priorityDistribution} rangeLabel={rangeLabel} isEmpty={isEmpty} />
      <TagTopCard items={tagTop} range={range} rangeLabel={rangeLabel} isEmpty={isEmpty} />
    </section>
  );
}

function StatusDistributionCard({
  items,
  rangeLabel,
  isEmpty = false,
}: {
  items: Array<DashboardDistributionItem<TaskStatus>>;
  rangeLabel: string;
  isEmpty?: boolean;
}) {
  const hasData = !isEmpty && items.some((item) => item.count > 0);
  const option = buildTaskStatusOption(items);

  return (
    <article className="dashboard-v2-panel dashboard-v2-distribution-card">
      <div className="dashboard-v2-panel__head">
        <h2>{rangeLabel}状态分布</h2>
      </div>
      {hasData ? (
        <div className="dashboard-v2-donut-layout">
          <EChartsClient
            className="dashboard-v2-echart dashboard-v2-echart--donut"
            ariaLabel="任务状态分布图"
            option={option}
            getClickHref={(params) => {
              const item = findDistributionItemByChartName(items, params);
              return item ? buildTasksHref({ status: item.value }) : undefined;
            }}
          />
          <DistributionLegend items={items} />
        </div>
      ) : (
        <DashboardV2EmptyBlock label="暂无状态" />
      )}
    </article>
  );
}

function PriorityDistributionCard({
  items,
  rangeLabel,
  isEmpty = false,
}: {
  items: Array<DashboardDistributionItem<TaskPriority>>;
  rangeLabel: string;
  isEmpty?: boolean;
}) {
  const hasData = !isEmpty && items.some((item) => item.count > 0);
  const option = buildTaskPriorityOption(items);

  return (
    <article className="dashboard-v2-panel dashboard-v2-distribution-card">
      <div className="dashboard-v2-panel__head">
        <h2>{rangeLabel}优先级</h2>
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

function TagTopCard({
  items,
  range,
  rangeLabel,
  isEmpty = false,
}: {
  items: DashboardTagTopItem[];
  range: DashboardAnalyticsRange;
  rangeLabel: string;
  isEmpty?: boolean;
}) {
  const hasData = !isEmpty && items.length > 0;
  const option = buildTaskTagTopOption(items);

  return (
    <article className="dashboard-v2-panel dashboard-v2-distribution-card">
      <div className="dashboard-v2-panel__head">
        <h2>{range === "all" ? "标签 Top 5" : `${rangeLabel}标签 Top 5`}</h2>
      </div>
      {hasData ? (
        <EChartsClient
          className="dashboard-v2-echart dashboard-v2-echart--compact dashboard-v2-echart--tags"
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

function DistributionLegend<TValue extends string>({ items }: { items: Array<DashboardDistributionItem<TValue>> }) {
  return (
    <div className="dashboard-v2-distribution-legend" aria-label="分布图例">
      {items.map((item) => (
        <div key={item.value} className={item.count === 0 ? "is-muted" : ""}>
          <span style={{ background: item.color }} aria-hidden="true" />
          <strong>{item.label}</strong>
          <b>{item.count}</b>
        </div>
      ))}
    </div>
  );
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
