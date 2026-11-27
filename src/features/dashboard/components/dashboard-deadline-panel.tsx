import Link from "next/link";

import { getTaskDueMeta } from "@/features/tasks/utils/task-deadline";
import type { DashboardStats } from "@/features/tasks/utils/task-analytics";
import { buildTasksHref } from "@/shared/lib/constants/query-params";

type DashboardDeadlinePanelProps = {
  deadlines: DashboardStats["upcomingDeadlines"];
  focusTasks: DashboardStats["focusTasks"];
  overdueCount: DashboardStats["overdueCount"];
  risks: DashboardStats["overdueRisk"];
  range: DashboardStats["range"];
  isLoading: boolean;
  onPreviewTask: (task: DashboardStats["upcomingDeadlines"][number]) => void;
};

const statusLabels = { todo: "待开始", in_progress: "进行中", done: "已完成" };

export function DashboardDeadlinePanel({
  deadlines,
  focusTasks,
  overdueCount,
  risks,
  range,
  isLoading,
  onPreviewTask,
}: DashboardDeadlinePanelProps) {
  const focusIds = new Set(focusTasks.map((task) => task.id));
  const visibleDeadlines = deadlines.filter((task) => !focusIds.has(task.id)).slice(0, 5);

  return (
    <section className="dashboard-v2-panel dashboard-v2-deadlines" aria-labelledby="dashboard-deadlines-title">
      <div className="dashboard-v2-panel__head">
        <h2 id="dashboard-deadlines-title">截止与风险</h2>
        <Link href={buildTasksHref({ due: range === "today" ? "today" : "upcoming" })}>查看截止任务</Link>
      </div>
      {isLoading ? (
        <p className="dashboard-v2-panel-note" role="status">
          正在加载截止任务…
        </p>
      ) : (
        <>
          {overdueCount > 0 ? (
            <div className="dashboard-v2-deadlines__alert">
              <strong>{overdueCount} 项任务已逾期</strong>
              <Link href={buildTasksHref({ risk: "overdue" })}>查看逾期</Link>
            </div>
          ) : (
            <p className="dashboard-v2-panel-note">暂无逾期</p>
          )}
          {visibleDeadlines.length ? (
            <ul className="dashboard-v2-deadlines__list" aria-label="截止任务">
              {visibleDeadlines.map((task) => {
                const { isOverdue } = getTaskDueMeta(task);

                return (
                  <li key={task.id}>
                    <button type="button" data-task-preview-id={task.id} onClick={() => onPreviewTask(task)}>
                      <span className="dashboard-v2-deadlines__task-title" title={task.title}>
                        {task.title}
                      </span>
                      <span className="dashboard-v2-deadlines__status">{statusLabels[task.status]}</span>
                      <span
                        className={isOverdue ? "dashboard-v2-deadlines__due is-overdue" : "dashboard-v2-deadlines__due"}
                      >
                        {task.dueLabel}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="dashboard-v2-panel-note dashboard-v2-deadlines__empty">暂无其他有截止日期的任务</p>
          )}
          {risks.some((risk) => risk.count > 0) ? (
            <ul className="dashboard-v2-deadlines__risks" aria-label="按风险查看任务">
              {risks
                .filter((risk) => risk.count > 0)
                .map((risk) => (
                  <li key={risk.level}>
                    <Link href={buildTasksHref({ risk: risk.level })} title={risk.helper}>
                      {risk.label} {risk.count}
                    </Link>
                  </li>
                ))}
            </ul>
          ) : null}
        </>
      )}
    </section>
  );
}
