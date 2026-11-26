import Link from "next/link";

import type { DashboardStats } from "@/features/tasks/utils/task-analytics";
import { buildTasksHref } from "@/shared/lib/constants/query-params";

type DashboardDistributionPanelProps = Pick<
  DashboardStats,
  "statusDistribution" | "priorityDistribution" | "tagTop"
> & {
  rangeLabel: string;
  isLoading: boolean;
};

export function DashboardDistributionPanel({
  statusDistribution,
  priorityDistribution,
  tagTop,
  rangeLabel,
  isLoading,
}: DashboardDistributionPanelProps) {
  const hasStatus = statusDistribution.some((item) => item.count > 0);
  const hasPriority = priorityDistribution.some((item) => item.count > 0);

  return (
    <section className="dashboard-v2-panel dashboard-v2-distribution" aria-labelledby="dashboard-distribution-title">
      <div className="dashboard-v2-panel__head">
        <h2 id="dashboard-distribution-title">任务分布</h2>
        <span>{rangeLabel}</span>
      </div>
      {isLoading ? (
        <p className="dashboard-v2-panel-note" role="status">
          正在加载任务分布…
        </p>
      ) : (
        <div className="dashboard-v2-distribution-grid">
          <div className="dashboard-v2-distribution__column">
            <h3>状态分布</h3>
            {hasStatus ? (
              <>
                <div className="dashboard-v2-distribution__stack" aria-hidden="true">
                  {statusDistribution
                    .filter((item) => item.count > 0)
                    .map((item) => (
                      <span key={item.value} style={{ flexGrow: item.count, backgroundColor: item.color }} />
                    ))}
                </div>
                <DistributionRows
                  items={statusDistribution.map((item) => ({
                    label: item.label,
                    count: item.count,
                    color: item.color,
                    href: buildTasksHref({ status: item.value }),
                  }))}
                />
              </>
            ) : (
              <p className="dashboard-v2-panel-note">暂无状态分布</p>
            )}
          </div>
          <div className="dashboard-v2-distribution__column">
            <h3>优先级</h3>
            {hasPriority ? (
              <DistributionRows
                items={priorityDistribution.map((item) => ({
                  label: item.label,
                  count: item.count,
                  ratio: item.ratio,
                  href: buildTasksHref({ priority: item.value }),
                }))}
              />
            ) : (
              <p className="dashboard-v2-panel-note">暂无优先级分布</p>
            )}
          </div>
          <div className="dashboard-v2-distribution__column">
            <h3>标签 Top 5</h3>
            {tagTop.length ? (
              <DistributionRows
                items={tagTop.slice(0, 5).map((item) => ({
                  label: item.tag,
                  count: item.count,
                  ratio: item.ratio,
                  href: buildTasksHref({ tag: item.tag }),
                }))}
              />
            ) : (
              <p className="dashboard-v2-panel-note">暂无标签数据</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

type DistributionRow = { label: string; count: number; href: string; color?: string; ratio?: number };

function DistributionRows({ items }: { items: DistributionRow[] }) {
  return (
    <ul className="dashboard-v2-distribution__rows">
      {items.map((item) => {
        const content = (
          <>
            <span className="dashboard-v2-distribution__label" title={item.label}>
              {item.color ? <i style={{ backgroundColor: item.color }} aria-hidden="true" /> : null}
              {item.label}
            </span>
            {item.ratio === undefined ? null : (
              <span className="dashboard-v2-distribution__track" aria-hidden="true">
                <span style={{ width: `${item.ratio}%` }} />
              </span>
            )}
            <strong className="dashboard-v2-distribution__count">{item.count}</strong>
          </>
        );

        return (
          <li key={item.href}>
            {item.count > 0 ? (
              <Link href={item.href} className="dashboard-v2-distribution__row">
                {content}
              </Link>
            ) : (
              <div className="dashboard-v2-distribution__row is-empty">{content}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
