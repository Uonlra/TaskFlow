import Link from "next/link";

import { TaskFormDialog } from "@/features/tasks/components/task-form-dialog";
import type { TaskFormValues } from "@/features/tasks/schemas/task-schema";
import type { Task } from "@/features/tasks/types/task.types";
import type { CalendarDaySummary } from "@/features/calendar/utils/calendar-task-summary";
import { getTaskDueMeta } from "@/features/tasks/utils/task-deadline";
import { buildTasksHref } from "@/shared/lib/constants/query-params";

type CalendarDayAgendaProps = {
  date: Date;
  dateParam: string;
  tasks: Task[];
  summary: CalendarDaySummary;
  isLoading: boolean;
  onCreateTask: (values: TaskFormValues) => void | Promise<void>;
  onPreviewTask: (task: Task) => void;
};

const statusLabels = { todo: "待开始", in_progress: "进行中", done: "已完成" };
const priorityLabels = { low: "低优先级", medium: "中优先级", high: "高优先级" };
const agendaDateFormat = new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "long" });

export function CalendarDayAgenda({
  date,
  dateParam,
  tasks,
  summary,
  isLoading,
  onCreateTask,
  onPreviewTask,
}: CalendarDayAgendaProps) {
  const dateLabel = agendaDateFormat.format(date);

  return (
    <section
      id="calendar-day-agenda"
      className="calendar-panel calendar-day-agenda card-surface"
      aria-label="选中日安排"
      tabIndex={-1}
    >
      <header className="calendar-day-agenda__head" aria-live="polite">
        <h2>
          <time dateTime={dateParam}>{dateLabel}</time>
        </h2>
        <p>{isLoading ? "正在同步任务…" : `共 ${summary.total} 项 · 已完成 ${summary.done} 项`}</p>
      </header>

      <div className="calendar-day-agenda__tasks" aria-busy={isLoading} data-lenis-prevent-wheel="true">
        {tasks.length ? (
          <ul className="calendar-day-agenda__list" aria-label="当天任务">
            {tasks.map((task) => {
              const { isOverdue } = getTaskDueMeta(task);
              const status = isOverdue ? "overdue" : task.status;
              return (
                <li key={task.id}>
                  <button
                    type="button"
                    className="calendar-agenda-task"
                    data-task-preview-id={task.id}
                    onClick={() => onPreviewTask(task)}
                  >
                    <span className={`calendar-status-dot calendar-status-dot--${status}`} aria-hidden="true" />
                    <span className="calendar-agenda-task__copy">
                      <strong>{task.title}</strong>
                      <small>
                        {statusLabels[task.status]} · {priorityLabels[task.priority]}
                        {isOverdue ? " · 已逾期" : ""}
                      </small>
                      {task.tags.length ? (
                        <small>
                          {task.tags
                            .slice(0, 2)
                            .map((tag) => `#${tag}`)
                            .join(" ")}
                        </small>
                      ) : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : !isLoading ? (
          <p className="calendar-day-agenda__empty">这一天还没有任务。</p>
        ) : null}
      </div>

      <footer className="calendar-day-agenda__actions">
        <TaskFormDialog
          key={dateParam}
          onSubmitTask={onCreateTask}
          createDefaults={{ dueDate: dateParam }}
          triggerLabel="创建任务"
          dialogEyebrow={dateLabel}
          dialogTitle="为这一天创建任务"
          triggerClassName="tesla-action tesla-action--primary"
        />
        {tasks.length ? <Link href={buildTasksHref({ date: dateParam })}>在任务页查看</Link> : null}
      </footer>
    </section>
  );
}
