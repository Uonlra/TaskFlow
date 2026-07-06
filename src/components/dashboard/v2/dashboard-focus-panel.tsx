import type { DashboardTaskPreview } from "@/features/tasks/utils/task-analytics";

type DashboardFocusPanelProps = {
  tasks: DashboardTaskPreview[];
  deadlines: DashboardTaskPreview[];
};

export function DashboardFocusPanel({ tasks, deadlines }: DashboardFocusPanelProps) {
  return (
    <>
      <section className="dashboard-v2-panel">
        <div className="dashboard-v2-panel__head">
          <h2>重点任务</h2>
          <span>查看全部</span>
        </div>
        <TaskPreviewList tasks={tasks} emptyLabel="暂无重点任务" />
      </section>

      <section className="dashboard-v2-panel">
        <div className="dashboard-v2-panel__head">
          <h2>近期截止</h2>
          <span>查看全部</span>
        </div>
        <TaskPreviewList tasks={deadlines} emptyLabel="暂无临近截止" />
      </section>
    </>
  );
}

function TaskPreviewList({ tasks, emptyLabel }: { tasks: DashboardTaskPreview[]; emptyLabel: string }) {
  if (!tasks.length) {
    return <p className="dashboard-v2-empty">{emptyLabel}</p>;
  }

  return (
    <div className="dashboard-v2-task-list">
      {tasks.map((task) => (
        <article key={task.id} className={`dashboard-v2-task dashboard-v2-task--${task.priority}`}>
          <span className="dashboard-v2-task__flag" aria-hidden="true" />
          <div>
            <strong>{task.title}</strong>
            <small>{task.dueLabel}</small>
          </div>
        </article>
      ))}
    </div>
  );
}
