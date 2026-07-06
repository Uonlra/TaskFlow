import { EChartsClient } from "@/components/charts/echarts-client";
import {
  buildTaskPriorityOption,
  buildTaskStatusOption,
  buildTaskTagTopOption,
} from "@/components/charts/task-chart-options";
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
  const option = buildTaskStatusOption(items);

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
  const option = buildTaskPriorityOption(items);

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
  const option = buildTaskTagTopOption(items);

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
