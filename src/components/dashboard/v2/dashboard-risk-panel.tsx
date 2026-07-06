import Link from "next/link";

import type { DashboardOverdueRiskItem } from "@/features/tasks/utils/task-analytics";
import { buildTasksHref } from "@/lib/constants/query-params";

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
      <div className="dashboard-v2-risk__summary">
        <strong>{overdueCount}</strong>
        <span>{hasRiskData ? "风险任务" : "暂无风险"}</span>
      </div>
      {hasRiskData ? (
        <div className="dashboard-v2-risk__list">
          {risks.map((risk) => (
            <div key={risk.level} className="dashboard-v2-risk__item">
              <span style={{ background: risk.color }} aria-hidden="true" />
              <div>
                <strong>{risk.label}</strong>
                <small>{risk.helper}</small>
              </div>
              <b>{risk.count}</b>
            </div>
          ))}
        </div>
      ) : (
        <div className="dashboard-v2-empty-list dashboard-v2-empty-list--compact">
          <span />
          <strong>暂无风险</strong>
          <p>截止任务会在这里提醒</p>
        </div>
      )}
    </section>
  );
}
