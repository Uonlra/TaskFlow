import Link from "next/link";

import type { DashboardOverdueRiskItem } from "@/features/tasks/utils/task-analytics";
import { DataEmptyState } from "@/shared/components/common/data-empty-state";
import { buildTasksHref } from "@/shared/lib/constants/query-params";

type DashboardRiskPanelProps = {
  risks: DashboardOverdueRiskItem[];
  overdueCount: number;
  isEmpty?: boolean;
};

export function DashboardRiskPanel({ risks, overdueCount, isEmpty = false }: DashboardRiskPanelProps) {
  const hasRiskData = !isEmpty && risks.some((risk) => risk.count > 0);

  return (
    <section className="dashboard-v2-panel dashboard-v2-risk">
      <div className="dashboard-v2-panel__head">
        <h2>逾期风险</h2>
        <Link href={buildTasksHref({ risk: "overdue" })}>{overdueCount} 逾期</Link>
      </div>
      {hasRiskData ? (
        <>
          <div className="dashboard-v2-risk__summary">
            <strong>{overdueCount}</strong>
            <span>风险任务</span>
          </div>
          <div className="dashboard-v2-risk__list">
            {risks.map((risk) => (
              <Link key={risk.level} href={buildTasksHref({ risk: risk.level })} className="dashboard-v2-risk__item">
                <span style={{ background: risk.color }} aria-hidden="true" />
                <div>
                  <strong>{risk.label}</strong>
                  <small>{risk.helper}</small>
                </div>
                <b>{risk.count}</b>
              </Link>
            ))}
          </div>
        </>
      ) : (
        <DataEmptyState
          variant="panel"
          title="暂无逾期风险"
          description="出现逾期任务时会在这里提醒。"
        />
      )}
    </section>
  );
}

