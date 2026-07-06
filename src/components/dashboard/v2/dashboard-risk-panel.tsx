import type { DashboardOverdueRiskItem } from "@/features/tasks/utils/task-analytics";

type DashboardRiskPanelProps = {
  risks: DashboardOverdueRiskItem[];
  overdueCount: number;
};

export function DashboardRiskPanel({ risks, overdueCount }: DashboardRiskPanelProps) {
  return (
    <section className="dashboard-v2-panel dashboard-v2-risk">
      <div className="dashboard-v2-panel__head">
        <h2>逾期风险</h2>
        <span>{overdueCount} 逾期</span>
      </div>
      <div className="dashboard-v2-risk__summary">
        <strong>{overdueCount}</strong>
        <span>风险任务</span>
      </div>
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
    </section>
  );
}
