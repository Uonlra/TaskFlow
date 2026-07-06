import type {
  DashboardDistributionItem,
  DashboardTagTopItem,
} from "@/features/tasks/utils/task-analytics";
import type { TaskPriority, TaskStatus } from "@/features/tasks/types/task.types";

type DashboardDistributionPanelProps = {
  statusDistribution: Array<DashboardDistributionItem<TaskStatus>>;
  priorityDistribution: Array<DashboardDistributionItem<TaskPriority>>;
  tagTop: DashboardTagTopItem[];
};

export function DashboardDistributionPanel({
  statusDistribution,
  priorityDistribution,
  tagTop,
}: DashboardDistributionPanelProps) {
  return (
    <section className="dashboard-v2-distribution-grid">
      <DistributionCard title="任务状态分布" items={statusDistribution} />
      <DistributionCard title="优先级分布" items={priorityDistribution} />
      <TagTopCard items={tagTop} />
    </section>
  );
}

function DistributionCard<TValue extends string>({
  title,
  items,
}: {
  title: string;
  items: Array<DashboardDistributionItem<TValue>>;
}) {
  return (
    <article className="dashboard-v2-panel dashboard-v2-distribution-card">
      <div className="dashboard-v2-panel__head">
        <h2>{title}</h2>
      </div>
      <div className="dashboard-v2-list-bars">
        {items.map((item) => (
          <div key={item.value} className="dashboard-v2-list-bar">
            <span>{item.label}</span>
            <div>
              <i style={{ width: `${item.ratio}%`, background: item.color }} />
            </div>
            <strong>{item.count}</strong>
          </div>
        ))}
      </div>
    </article>
  );
}

function TagTopCard({ items }: { items: DashboardTagTopItem[] }) {
  return (
    <article className="dashboard-v2-panel dashboard-v2-distribution-card">
      <div className="dashboard-v2-panel__head">
        <h2>标签 Top 5</h2>
      </div>
      <div className="dashboard-v2-list-bars">
        {items.length ? (
          items.map((item) => (
            <div key={item.tag} className="dashboard-v2-list-bar">
              <span>{item.tag}</span>
              <div>
                <i style={{ width: `${item.ratio}%`, background: item.color }} />
              </div>
              <strong>{item.count}</strong>
            </div>
          ))
        ) : (
          <p className="dashboard-v2-empty">暂无标签</p>
        )}
      </div>
    </article>
  );
}
