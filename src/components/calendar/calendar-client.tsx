"use client";

import { useEffect, useMemo } from "react";

import { getTaskDueMeta, sortTasks } from "@/features/tasks/utils/task-deadline";
import { useAuth } from "@/providers/auth-provider";
import { useTaskStore } from "@/store/task-store";

export function CalendarClient() {
  const { user, isConfigured } = useAuth();
  const tasks = useTaskStore((state) => state.tasks);
  const isLoading = useTaskStore((state) => state.isLoading);
  const lastLoadedUserId = useTaskStore((state) => state.lastLoadedUserId);
  const syncTasks = useTaskStore((state) => state.syncTasks);

  useEffect(() => {
    if (isConfigured && user?.id && lastLoadedUserId !== user.id) {
      void syncTasks(user.id);
    }
  }, [isConfigured, lastLoadedUserId, syncTasks, user?.id]);

  const activeTasks = useMemo(() => tasks.filter((task) => task.status !== "done"), [tasks]);
  const dueToday = useMemo(
    () => activeTasks.filter((task) => getTaskDueMeta(task).isDueToday),
    [activeTasks],
  );
  const upcoming = useMemo(
    () => sortTasks(activeTasks, "due_asc").filter((task) => task.dueDate).slice(0, 6),
    [activeTasks],
  );
  const timeline = useMemo(
    () => sortTasks(activeTasks, "due_asc").filter((task) => task.dueDate).slice(0, 8),
    [activeTasks],
  );

  return (
    <section className="calendar-shell">
      <CalendarOverview todayCount={dueToday.length} upcomingCount={upcoming.length} isLoading={isLoading} />
      <div className="calendar-layout-grid">
        <CalendarUpcomingPanel tasks={upcoming} />
        <CalendarTimeline tasks={timeline} />
      </div>
    </section>
  );
}

function CalendarOverview({
  todayCount,
  upcomingCount,
  isLoading,
}: {
  todayCount: number;
  upcomingCount: number;
  isLoading: boolean;
}) {
  return (
    <section className="calendar-overview card-surface">
      <article>
        <span>今天到期</span>
        <strong>{isLoading ? "--" : todayCount}</strong>
      </article>
      <article>
        <span>即将到期</span>
        <strong>{isLoading ? "--" : upcomingCount}</strong>
      </article>
      <article>
        <span>时间线</span>
        <strong>占位</strong>
      </article>
    </section>
  );
}

function CalendarUpcomingPanel({ tasks }: { tasks: Array<{ id: string; title: string; dueDate?: string }> }) {
  return (
    <section className="calendar-panel card-surface">
      <div className="calendar-panel__head">
        <p className="section-eyebrow panel-eyebrow">截止日期</p>
        <h2>即将到期</h2>
      </div>
      <div className="calendar-task-list">
        {tasks.length ? (
          tasks.map((task) => (
            <article key={task.id} className="calendar-task-row">
              <span />
              <strong>{task.title}</strong>
              <small>{formatShortDate(task.dueDate)}</small>
            </article>
          ))
        ) : (
          <p className="calendar-empty">暂无临近截止任务</p>
        )}
      </div>
    </section>
  );
}

function CalendarTimeline({ tasks }: { tasks: Array<{ id: string; title: string; dueDate?: string }> }) {
  return (
    <section className="calendar-panel card-surface">
      <div className="calendar-panel__head">
        <p className="section-eyebrow panel-eyebrow">任务时间线</p>
        <h2>日程占位</h2>
      </div>
      <div className="calendar-timeline">
        {tasks.length ? (
          tasks.map((task) => (
            <article key={task.id} className="calendar-timeline__item">
              <time>{formatShortDate(task.dueDate)}</time>
              <span>{task.title}</span>
            </article>
          ))
        ) : (
          <p className="calendar-empty">时间线等待任务数据</p>
        )}
      </div>
    </section>
  );
}

function formatShortDate(value: string | undefined) {
  if (!value) {
    return "--";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return `${date.getMonth() + 1}/${date.getDate()}`;
}
