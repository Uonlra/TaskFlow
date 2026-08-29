"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { DataEmptyState } from "@/shared/components/common/data-empty-state";

import { CalendarDayDrawer } from "@/features/calendar/components/calendar-day-drawer";
import { TaskQuickViewDialog } from "@/features/tasks/components/task-quick-view-dialog";
import type { TaskFormValues } from "@/features/tasks/schemas/task-schema";
import type { Task, TaskPriority, TaskStatus } from "@/features/tasks/types/task.types";
import {
  addTaskDays,
  formatTaskDateParam,
  hasTaskDueDate,
  isTaskDueOnDate,
  parseTaskDateParam,
  parseTaskDueDate,
  startOfTaskDay,
} from "@/features/tasks/utils/task-date-filters";
import { getTaskDueMeta } from "@/features/tasks/utils/task-deadline";
import {
  buildCalendarTaskSummaries,
  type CalendarDaySummary,
  type CalendarStatus,
} from "@/features/calendar/utils/calendar-task-summary";
import {
  buildCalendarHref,
  buildTasksHref,
  CALENDAR_QUERY_KEYS,
  DASHBOARD_RANGE_VALUES,
  type BuildTasksHrefInput,
  type DashboardRangeValue,
} from "@/shared/lib/constants/query-params";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { getWorkspaceState } from "@/features/auth/utils/workspace-state";
import { useToast } from "@/shared/providers/toast-provider";
import { useTaskStore } from "@/features/tasks/store/task-store";

type CalendarClientProps = {
  initialDate: string;
  initialRange: DashboardRangeValue;
};

type CalendarDay = {
  dateParam: string;
  dayLabel: string;
  isToday: boolean;
  isSelected: boolean;
  isCurrentMonth: boolean;
  summary: CalendarDaySummary;
};

const rangeOptions: Array<{ value: DashboardRangeValue; label: string }> = [
  { value: DASHBOARD_RANGE_VALUES.today, label: "今天" },
  { value: DASHBOARD_RANGE_VALUES.week, label: "本周" },
  { value: DASHBOARD_RANGE_VALUES.all, label: "全部" },
];

const statusLabels: Record<TaskStatus, string> = {
  todo: "待开始",
  in_progress: "进行中",
  done: "已完成",
};

const priorityLabels: Record<TaskPriority, string> = {
  high: "高",
  medium: "中",
  low: "低",
};

const priorityScore: Record<TaskPriority, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

export function CalendarClient({ initialDate, initialRange }: CalendarClientProps) {
  const { user, isConfigured, isLoading: isAuthLoading } = useAuth();
  const { showToast } = useToast();
  const storeTasks = useTaskStore((state) => state.tasks);
  const createTask = useTaskStore((state) => state.createTaskAsync);
  const updateTask = useTaskStore((state) => state.updateTask);
  const updateTaskStatus = useTaskStore((state) => state.updateTaskStatus);
  const deleteTask = useTaskStore((state) => state.deleteTask);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [hasAnyTasks, setHasAnyTasks] = useState(false);
  const [attentionCounts, setAttentionCounts] = useState<CalendarAttention>({ overdueCount: 0, nearDueCount: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dateParam = parseCalendarDate(searchParams.get(CALENDAR_QUERY_KEYS.date) ?? initialDate);
  const range = parseCalendarRange(searchParams.get(CALENDAR_QUERY_KEYS.range) ?? initialRange);
  const isDateDrawerOpen = searchParams.get(CALENDAR_QUERY_KEYS.drawer) === "date";
  const previewTaskId = searchParams.get(CALENDAR_QUERY_KEYS.task);
  const selectedDate = useMemo(() => parseTaskDateParam(dateParam) ?? startOfTaskDay(new Date()), [dateParam]);
  const monthGridStart = useMemo(() => getCalendarGridStart(selectedDate), [selectedDate]);
  const rangeFrom = formatTaskDateParam(monthGridStart);
  const rangeTo = formatTaskDateParam(addTaskDays(monthGridStart, 42));

  const loadCalendarTasks = useCallback(
    async (signal?: AbortSignal) => {
      if (!isAuthLoading && !user) {
        setTasks(storeTasks);
        setHasAnyTasks(storeTasks.length > 0);
        setAttentionCounts({ overdueCount: countGuestOverdue(storeTasks), nearDueCount: countGuestNearDue(storeTasks) });
        setIsLoading(false);
        return true;
      }

      if (!isConfigured || !user?.id || isAuthLoading) return false;

      setIsLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set("from", rangeFrom);
      params.set("to", rangeTo);

      try {
        const response = await fetch(`/api/tasks/range?${params.toString()}`, { signal });
        const payload = (await response.json().catch(() => null)) as {
          tasks?: Task[];
          hasAnyTasks?: boolean;
          attention?: CalendarAttention;
          message?: string;
        } | null;
        if (!response.ok || !payload?.tasks) {
          throw new Error(payload?.message || "无法加载日历任务。");
        }

        setTasks(payload.tasks);
        setHasAnyTasks(Boolean(payload.hasAnyTasks));
        setAttentionCounts(payload.attention ?? { overdueCount: 0, nearDueCount: 0 });
        return true;
      } catch {
        if (signal?.aborted) return false;

        setTasks([]);
        setHasAnyTasks(false);
        setAttentionCounts({ overdueCount: 0, nearDueCount: 0 });
        setError("日历任务暂时无法加载，请稍后重试。");
        return false;
      } finally {
        if (!signal?.aborted) setIsLoading(false);
      }
    },
    [isAuthLoading, isConfigured, rangeFrom, rangeTo, storeTasks, user],
  );

  useEffect(() => {
    const controller = new AbortController();
    const loadTimer = window.setTimeout(() => {
      void loadCalendarTasks(controller.signal);
    }, 0);

    return () => {
      window.clearTimeout(loadTimer);
      controller.abort();
    };
  }, [loadCalendarTasks]);

  const workspaceState = getWorkspaceState({
    isAuthLoading,
    isTaskLoading: isLoading,
    taskCount: hasAnyTasks ? 1 : 0,
    userId: user?.id,
  });
  const isSyncing = workspaceState === "syncing";
  const dueTasks = useMemo(() => tasks.filter(hasValidDueDate), [tasks]);
  const selectedDayTasks = useMemo(
    () => sortCalendarTasks(dueTasks.filter((task) => isTaskDueOnDate(task, selectedDate))),
    [dueTasks, selectedDate],
  );
  const taskSummaries = useMemo(() => buildCalendarTaskSummaries(dueTasks), [dueTasks]);
  const previewTask = useMemo(() => tasks.find((task) => task.id === previewTaskId) ?? null, [previewTaskId, tasks]);
  const selectedDaySummary = taskSummaries[dateParam] ?? createEmptyCalendarDaySummary();
  const monthDays = useMemo(() => buildMonthDays(selectedDate, taskSummaries), [selectedDate, taskSummaries]);
  const upcomingTasks = useMemo(
    () => buildUpcomingTasks(dueTasks, selectedDate, range),
    [dueTasks, range, selectedDate],
  );
  const attention = attentionCounts.overdueCount || attentionCounts.nearDueCount ? attentionCounts : null;
  const rangeLabel = rangeOptions.find((item) => item.value === range)?.label ?? "本周";
  const isAccountEmpty = !isAuthLoading && !hasAnyTasks;
  const isGuest = !isAuthLoading && !user;

  useEffect(() => {
    if (isGuest) {
      setTasks(storeTasks);
      setHasAnyTasks(storeTasks.length > 0);
      setAttentionCounts({ overdueCount: countGuestOverdue(storeTasks), nearDueCount: countGuestNearDue(storeTasks) });
      setIsLoading(false);
    }
  }, [isGuest, storeTasks]);

  const updateCalendar = (input: { date?: string; range?: DashboardRangeValue }) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(CALENDAR_QUERY_KEYS.date, input.date ?? dateParam);
    params.set(CALENDAR_QUERY_KEYS.range, input.range ?? range);
    params.delete(CALENDAR_QUERY_KEYS.drawer);
    params.delete(CALENDAR_QUERY_KEYS.task);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const closeDateDrawer = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(CALENDAR_QUERY_KEYS.drawer);
    params.delete(CALENDAR_QUERY_KEYS.task);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  const openTaskPreview = useCallback(
    (task: Task) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(CALENDAR_QUERY_KEYS.task, task.id);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const closeTaskPreview = useCallback(() => {
    const taskId = searchParams.get(CALENDAR_QUERY_KEYS.task);
    const params = new URLSearchParams(searchParams.toString());
    params.delete(CALENDAR_QUERY_KEYS.task);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    window.requestAnimationFrame(() => {
      if (taskId) document.querySelector<HTMLElement>(`[data-calendar-task-id="${taskId}"]`)?.focus();
    });
  }, [pathname, router, searchParams]);

  const handleCreateTask = async (values: TaskFormValues) => {
    try {
      if (isGuest) {
        await createTask(values);
        setTasks(useTaskStore.getState().tasks);
        showToast({ title: "任务已创建", description: `“${values.title}” 已添加到 ${values.dueDate || dateParam}。`, tone: "success" });
        return;
      }

      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.message || "创建任务失败，请稍后再试。");
      }

      const refreshed = await loadCalendarTasks();
      showToast({
        title: "任务已创建",
        description: refreshed
          ? `“${values.title}” 已添加到 ${values.dueDate || dateParam}。`
          : "任务已保存，但日历刷新失败，请稍后重试。",
        tone: refreshed ? "success" : "info",
      });
    } catch (createError) {
      const message = createError instanceof Error ? createError.message : "请稍后再试。";
      showToast({ title: "创建任务失败", description: message, tone: "error" });
      throw createError;
    }
  };

  const handleUpdateTask = async (task: Task, values: TaskFormValues) => {
    try {
      if (isGuest) {
        await updateTask(task.id, values);
        setTasks(useTaskStore.getState().tasks);
        showToast({ title: "任务已更新", description: `“${values.title}” 的修改已保存。`, tone: "success" });
        return;
      }

      const payload = await requestTaskMutation<{ task: Task }>(task.id, { method: "PATCH", body: values });
      setTasks((current) => current.map((item) => (item.id === task.id ? payload.task : item)));
      const refreshed = await loadCalendarTasks();
      showToast({
        title: "任务已更新",
        description: refreshed ? `“${values.title}” 的修改已保存。` : "修改已保存，但日历刷新失败，请稍后重试。",
        tone: refreshed ? "success" : "info",
      });
    } catch (updateError) {
      const message = updateError instanceof Error ? updateError.message : "请稍后再试。";
      showToast({ title: "更新失败", description: message, tone: "error" });
      throw updateError;
    }
  };

  const handleToggleTaskComplete = async (task: Task) => {
    const status = task.status === "done" ? "todo" : "done";
    try {
      if (isGuest) {
        await updateTaskStatus(task.id, status);
        setTasks(useTaskStore.getState().tasks);
        showToast({ title: "状态已更新", description: `“${task.title}” 已标记为${status === "done" ? "已完成" : "待开始"}。`, tone: "success" });
        return;
      }

      const payload = await requestTaskMutation<{ task: Task }>(task.id, { method: "PATCH", body: { status } });
      setTasks((current) => current.map((item) => (item.id === task.id ? payload.task : item)));
      const refreshed = await loadCalendarTasks();
      showToast({
        title: "状态已更新",
        description: refreshed
          ? `“${task.title}” 已标记为${status === "done" ? "已完成" : "待开始"}。`
          : "状态已保存，但日历刷新失败，请稍后重试。",
        tone: refreshed ? "success" : "info",
      });
    } catch (statusError) {
      showToast({
        title: "状态更新失败",
        description: statusError instanceof Error ? statusError.message : "请稍后再试。",
        tone: "error",
      });
    }
  };

  const handleDeleteTask = async (task: Task) => {
    try {
      if (isGuest) {
        await deleteTask(task.id);
        closeTaskPreview();
        setTasks(useTaskStore.getState().tasks);
        showToast({ title: "任务已删除", description: `“${task.title}” 已从当前日期移除。`, tone: "success" });
        return;
      }

      await requestTaskMutation(task.id, { method: "DELETE" });
      closeTaskPreview();
      setTasks((current) => current.filter((item) => item.id !== task.id));
      const refreshed = await loadCalendarTasks();
      showToast({
        title: "任务已删除",
        description: refreshed ? `“${task.title}” 已从当前日期移除。` : "任务已删除，但日历刷新失败。",
        tone: refreshed ? "success" : "info",
      });
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : "请稍后再试。";
      showToast({ title: "删除失败", description: message, tone: "error" });
      throw deleteError;
    }
  };

  if (error) {
    return (
      <section className="calendar-shell calendar-shell--empty">
        <CalendarToolbar
          date={selectedDate}
          dateParam={dateParam}
          range={range}
          rangeLabel={rangeLabel}
          isSyncing={false}
          isAccountEmpty={false}
          onDateChange={(nextDate) => updateCalendar({ date: formatTaskDateParam(nextDate) })}
          onRangeChange={(nextRange) => updateCalendar({ range: nextRange })}
        />
        <DataEmptyState title="日历加载失败" description={error} />
      </section>
    );
  }

  if (isAccountEmpty) {
    return (
      <section className="calendar-shell calendar-shell--empty">
        <DataEmptyState
          title="日历等待第一条任务"
          description="为任务设置截止日期后，会在这里形成时间线。"
          action={<Link href="/tasks">创建任务</Link>}
        />
      </section>
    );
  }

  return (
    <section className="calendar-shell">
      <CalendarToolbar
        date={selectedDate}
        dateParam={dateParam}
        range={range}
        rangeLabel={rangeLabel}
        isSyncing={isSyncing}
        isAccountEmpty={isAccountEmpty}
        onDateChange={(nextDate) => updateCalendar({ date: formatTaskDateParam(nextDate) })}
        onRangeChange={(nextRange) => updateCalendar({ range: nextRange })}
      />
      {attention ? <CalendarAttentionBar attention={attention} /> : null}
      <div className="calendar-layout-grid">
        <main className="calendar-main-stack">
          <CalendarMonthGrid days={monthDays} range={range} selectedDate={selectedDate} />
          <CalendarTimeline tasks={selectedDayTasks} selectedDate={selectedDate} isSyncing={isSyncing} />
        </main>
        <aside className="calendar-side-stack">
          <CalendarUpcomingPanel
            tasks={upcomingTasks}
            range={range}
            rangeLabel={rangeLabel}
            selectedDate={selectedDate}
            isSyncing={isSyncing}
          />
          <CalendarQuickLinks />
        </aside>
      </div>
      <CalendarDayDrawer
        open={isDateDrawerOpen}
        dateParam={dateParam}
        tasks={selectedDayTasks}
        summary={selectedDaySummary}
        isLoading={isLoading}
        onClose={closeDateDrawer}
        onCreateTask={handleCreateTask}
        onPreviewTask={openTaskPreview}
      />
      <TaskQuickViewDialog
        task={previewTask}
        onClose={closeTaskPreview}
        onUpdateTask={handleUpdateTask}
        onToggleComplete={handleToggleTaskComplete}
        onDelete={handleDeleteTask}
      />
    </section>
  );
}

async function requestTaskMutation<T = unknown>(taskId: string, init: { method: "PATCH" | "DELETE"; body?: unknown }) {
  const response = await fetch(`/api/tasks/${encodeURIComponent(taskId)}`, {
    method: init.method,
    headers: init.body === undefined ? undefined : { "Content-Type": "application/json" },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const payload = (await response.json().catch(() => null)) as (T & { message?: string }) | null;

  if (!response.ok || !payload) {
    throw new Error(payload?.message || "任务操作失败，请稍后再试。");
  }

  return payload;
}

function CalendarToolbar({
  date,
  dateParam,
  range,
  rangeLabel,
  isSyncing,
  isAccountEmpty,
  onDateChange,
  onRangeChange,
}: {
  date: Date;
  dateParam: string;
  range: DashboardRangeValue;
  rangeLabel: string;
  isSyncing: boolean;
  isAccountEmpty: boolean;
  onDateChange: (date: Date) => void;
  onRangeChange: (range: DashboardRangeValue) => void;
}) {
  const statusLabel = isSyncing ? "同步中" : isAccountEmpty ? "暂无任务" : "已同步";

  return (
    <section className="calendar-toolbar card-surface">
      <div className="calendar-toolbar__copy">
        <span className="calendar-eyebrow">{statusLabel}</span>
        <h2>日历</h2>
        <p>
          {formatReadableDate(date)} · {rangeLabel}
        </p>
      </div>
      <div className="calendar-toolbar__controls">
        <div className="calendar-range-tabs date-switcher" aria-label="日历范围">
          {rangeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={
                range === option.value
                  ? "calendar-range-tabs__button date-switcher__button is-active"
                  : "calendar-range-tabs__button date-switcher__button"
              }
              onClick={() => onRangeChange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="calendar-date-nav date-switcher" aria-label="日期切换">
          <button
            type="button"
            className="date-switcher__button"
            onClick={() => onDateChange(shiftCalendarMonth(date, -1))}
            aria-label="上个月"
          >
            <span aria-hidden="true">‹</span>
          </button>
          <button type="button" className="date-switcher__button" onClick={() => onDateChange(new Date())}>
            今天
          </button>
          <button
            type="button"
            className="date-switcher__button"
            onClick={() => onDateChange(shiftCalendarMonth(date, 1))}
            aria-label="下个月"
          >
            <span aria-hidden="true">›</span>
          </button>
        </div>
        <Link
          className="calendar-toolbar__date-link mobile-date-switcher__date"
          href={buildCalendarHref({ date: dateParam, range })}
        >
          {dateParam}
        </Link>
      </div>
    </section>
  );
}

type CalendarAttention = {
  overdueCount: number;
  nearDueCount: number;
};

function CalendarAttentionBar({ attention }: { attention: CalendarAttention }) {
  const allAttentionHref = buildTasksHref({ due: attention.nearDueCount ? "near" : "overdue" });

  return (
    <section className="calendar-attention card-surface" aria-label="任务提醒" aria-live="polite">
      <span className="calendar-attention__label">需要关注</span>
      <div className="calendar-attention__items">
        {attention.overdueCount ? (
          <Link
            className="calendar-attention__item calendar-attention__item--overdue"
            href={buildTasksHref({ due: "overdue" })}
          >
            <span className="calendar-attention__dot" aria-hidden="true" />
            <span>已逾期</span>
            <strong>{attention.overdueCount}</strong>
            <span>项</span>
          </Link>
        ) : null}
        {attention.nearDueCount ? (
          <Link
            className="calendar-attention__item calendar-attention__item--near"
            href={buildTasksHref({ due: "near" })}
          >
            <span className="calendar-attention__dot" aria-hidden="true" />
            <span>近期到期</span>
            <strong>{attention.nearDueCount}</strong>
            <span>项</span>
          </Link>
        ) : null}
      </div>
      <Link className="calendar-attention__all" href={allAttentionHref}>
        查看任务
      </Link>
    </section>
  );
}

function CalendarMonthGrid({
  days,
  range,
  selectedDate,
}: {
  days: CalendarDay[];
  range: DashboardRangeValue;
  selectedDate: Date;
}) {
  return (
    <section className="calendar-panel calendar-month-panel card-surface">
      <div className="calendar-panel__head calendar-panel__head--inline">
        <div>
          <span className="calendar-eyebrow">月视图</span>
          <h2>{formatCalendarMonth(selectedDate)}</h2>
        </div>
        <Link
          href={buildTasksHref({
            date: formatTaskDateParam(selectedDate),
            range: DASHBOARD_RANGE_VALUES.week,
          })}
        >
          查看任务
        </Link>
      </div>
      <CalendarStatusLegend />
      <div className="calendar-weekday-row" aria-hidden="true">
        {weekdayLabels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      <div className="calendar-month-grid" aria-label={`${formatCalendarMonth(selectedDate)}日期`}>
        {days.map((day) => (
          <Link
            key={day.dateParam}
            href={buildCalendarHref({ date: day.dateParam, range, drawer: "date" })}
            data-calendar-date={day.dateParam}
            className={[
              "calendar-month-day",
              day.isSelected ? "is-selected" : "",
              day.isToday ? "is-today" : "",
              day.isCurrentMonth ? "" : "is-outside-month",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-current={day.isSelected ? "date" : undefined}
            aria-label={formatCalendarDayAriaLabel(day)}
          >
            <span className="calendar-month-day__number">{day.dayLabel}</span>
            {day.summary.statusDots.length ? (
              <span className="calendar-status-dots" aria-hidden="true">
                {day.summary.statusDots.map((status) => (
                  <span key={status} className={`calendar-status-dot calendar-status-dot--${status}`} />
                ))}
              </span>
            ) : null}
            <small className="calendar-month-day__count">{day.summary.total ? `${day.summary.total} 项` : ""}</small>
          </Link>
        ))}
      </div>
    </section>
  );
}

const calendarStatusLegend: Array<{ status: CalendarStatus; label: string }> = [
  { status: "done", label: "已完成" },
  { status: "in_progress", label: "进行中" },
  { status: "todo", label: "待开始" },
  { status: "overdue", label: "已逾期" },
];

function CalendarStatusLegend() {
  return (
    <div className="calendar-status-legend" aria-label="任务状态图例">
      {calendarStatusLegend.map((item) => (
        <span key={item.status}>
          <span className={`calendar-status-dot calendar-status-dot--${item.status}`} aria-hidden="true" />
          {item.label}
        </span>
      ))}
    </div>
  );
}

function CalendarTimeline({
  tasks,
  selectedDate,
  isSyncing,
}: {
  tasks: Task[];
  selectedDate: Date;
  isSyncing: boolean;
}) {
  return (
    <section className="calendar-panel card-surface">
      <div className="calendar-panel__head calendar-panel__head--inline">
        <div>
          <span className="calendar-eyebrow">任务时间线</span>
          <h2>{formatMonthDay(selectedDate)} 截止</h2>
        </div>
        <Link href={buildTasksHref({ date: formatTaskDateParam(selectedDate) })}>筛选任务</Link>
      </div>
      <div className="calendar-timeline">
        {tasks.length ? (
          tasks.map((task) => <CalendarTimelineItem key={task.id} task={task} />)
        ) : (
          <CalendarEmptyState
            label={isSyncing ? "同步中" : "今天暂无截止"}
            description={isSyncing ? "数据准备完成后自动显示。" : "该日期没有设置截止时间的任务。"}
          />
        )}
      </div>
    </section>
  );
}

function CalendarTimelineItem({ task }: { task: Task }) {
  const dueMeta = getTaskDueMeta(task);

  return (
    <Link
      href={getTaskCalendarHref(task)}
      className={`calendar-timeline__item calendar-timeline__item--${task.priority}${task.status === "done" ? " is-done" : ""}`}
    >
      <time>全天</time>
      <span className="calendar-timeline__flag" aria-hidden="true" />
      <div className="calendar-timeline__body">
        <strong>{task.title}</strong>
        <div className="calendar-timeline__meta">
          <span>{priorityLabels[task.priority]}优先级</span>
          <span>{statusLabels[task.status]}</span>
          <span>{dueMeta.label}</span>
          {task.tags.slice(0, 2).map((tag) => (
            <span key={tag}>#{tag}</span>
          ))}
        </div>
      </div>
    </Link>
  );
}

function CalendarUpcomingPanel({
  tasks,
  range,
  rangeLabel,
  selectedDate,
  isSyncing,
}: {
  tasks: Task[];
  range: DashboardRangeValue;
  rangeLabel: string;
  selectedDate: Date;
  isSyncing: boolean;
}) {
  return (
    <section className="calendar-panel card-surface">
      <div className="calendar-panel__head calendar-panel__head--inline">
        <div>
          <span className="calendar-eyebrow">截止提醒</span>
          <h2>{rangeLabel}即将到期</h2>
        </div>
        <Link href={buildCalendarTasksHref(formatTaskDateParam(selectedDate), range)}>查看全部</Link>
      </div>
      <div className="calendar-task-list">
        {tasks.length ? (
          tasks.map((task) => {
            const dueMeta = getTaskDueMeta(task);
            return (
              <Link
                key={task.id}
                href={getTaskCalendarHref(task)}
                className={`calendar-task-row calendar-task-row--${task.priority}`}
              >
                <span aria-hidden="true" />
                <div>
                  <strong>{task.title}</strong>
                  <small>{dueMeta.label}</small>
                </div>
                <b>{priorityLabels[task.priority]}</b>
              </Link>
            );
          })
        ) : (
          <CalendarEmptyState
            label={isSyncing ? "同步中" : "暂无近期截止"}
            description={isSyncing ? "数据准备完成后自动显示。" : "当前范围没有临近截止的任务。"}
          />
        )}
      </div>
    </section>
  );
}

function CalendarQuickLinks() {
  return (
    <section className="calendar-panel calendar-quick-panel card-surface">
      <div className="calendar-panel__head">
        <span className="calendar-eyebrow">快捷入口</span>
        <h2>任务筛选</h2>
      </div>
      <div className="calendar-quick-links">
        <Link href={buildTasksHref({ due: "today" })}>今日截止</Link>
        <Link href={buildTasksHref({ due: "overdue" })}>已逾期</Link>
        <Link href={buildTasksHref({ due: "upcoming" })}>即将到期</Link>
        <Link href={buildTasksHref({ priority: "high" })}>高优先级</Link>
      </div>
    </section>
  );
}

function CalendarEmptyState({ label, description }: { label: string; description: string }) {
  return <DataEmptyState variant="panel" title={label} description={description} />;
}

function buildCalendarTasksHref(dateParam: string, range: DashboardRangeValue, input: BuildTasksHrefInput = {}) {
  if (range === DASHBOARD_RANGE_VALUES.all) {
    return buildTasksHref({ ...input, range });
  }

  if (range === DASHBOARD_RANGE_VALUES.week) {
    return buildTasksHref({ ...input, date: dateParam, range });
  }

  return buildTasksHref({ ...input, date: dateParam });
}
const weekdayLabels = ["一", "二", "三", "四", "五", "六", "日"];

function buildMonthDays(selectedDate: Date, summaries: Record<string, CalendarDaySummary>): CalendarDay[] {
  const start = getCalendarGridStart(selectedDate);
  const today = startOfTaskDay(new Date());

  return Array.from({ length: 42 }, (_, index) => {
    const date = addTaskDays(start, index);
    const dateParam = formatTaskDateParam(date);
    return {
      dateParam,
      dayLabel: String(date.getDate()),
      isToday: isSameCalendarDay(date, today),
      isSelected: isSameCalendarDay(date, selectedDate),
      isCurrentMonth: date.getMonth() === selectedDate.getMonth() && date.getFullYear() === selectedDate.getFullYear(),
      summary: summaries[dateParam] ?? createEmptyCalendarDaySummary(),
    };
  });
}

function getCalendarGridStart(date: Date) {
  const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
  const mondayOffset = monthStart.getDay() === 0 ? 6 : monthStart.getDay() - 1;
  return addTaskDays(monthStart, -mondayOffset);
}

function buildUpcomingTasks(dueTasks: Task[], selectedDate: Date, range: DashboardRangeValue) {
  const activeTasks = dueTasks.filter((task) => task.status !== "done");
  const start = startOfTaskDay(selectedDate);
  const end =
    range === DASHBOARD_RANGE_VALUES.all
      ? addTaskDays(start, 30)
      : addTaskDays(start, range === DASHBOARD_RANGE_VALUES.today ? 1 : 7);

  return sortCalendarTasks(
    activeTasks.filter((task) => {
      const dueDate = parseTaskDueDate(task);
      return dueDate && dueDate >= start && dueDate < end;
    }),
  ).slice(0, 6);
}

function sortCalendarTasks(tasks: Task[]) {
  return [...tasks].sort((left, right) => {
    if (left.status === "done" && right.status !== "done") return 1;
    if (left.status !== "done" && right.status === "done") return -1;

    const leftDueMeta = getTaskDueMeta(left);
    const rightDueMeta = getTaskDueMeta(right);

    if (leftDueMeta.isOverdue !== rightDueMeta.isOverdue) {
      return leftDueMeta.isOverdue ? -1 : 1;
    }

    const priorityDiff = priorityScore[right.priority] - priorityScore[left.priority];
    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    return (
      (parseTaskDueDate(left)?.getTime() ?? Number.POSITIVE_INFINITY) -
      (parseTaskDueDate(right)?.getTime() ?? Number.POSITIVE_INFINITY)
    );
  });
}

function getTaskCalendarHref(task: Task) {
  const dueDate = parseTaskDueDate(task);

  if (dueDate) {
    return buildTasksHref({ date: formatTaskDateParam(dueDate) });
  }

  return buildTasksHref();
}

function hasValidDueDate(task: Task) {
  return hasTaskDueDate(task);
}

function countGuestOverdue(tasks: Task[]) {
  return tasks.filter((task) => task.status !== "done" && getTaskDueMeta(task).isOverdue).length;
}

function countGuestNearDue(tasks: Task[]) {
  return tasks.filter((task) => task.status !== "done" && (getTaskDueMeta(task).isDueToday || getTaskDueMeta(task).isUpcoming)).length;
}

function parseCalendarRange(value: string | null | undefined): DashboardRangeValue {
  if (value === DASHBOARD_RANGE_VALUES.today || value === DASHBOARD_RANGE_VALUES.all) {
    return value;
  }

  return DASHBOARD_RANGE_VALUES.week;
}

function parseCalendarDate(value: string | null | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return formatTaskDateParam(new Date());
  }

  const date = parseTaskDateParam(value);

  if (!date || formatTaskDateParam(date) !== value) {
    return formatTaskDateParam(new Date());
  }

  return value;
}

function formatReadableDate(value: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).format(value);
}

function formatCalendarMonth(value: Date) {
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long" }).format(value);
}

function shiftCalendarMonth(value: Date, amount: number) {
  const originalDay = value.getDate();
  const target = new Date(value.getFullYear(), value.getMonth() + amount, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();

  target.setDate(Math.min(originalDay, lastDay));
  return startOfTaskDay(target);
}

function formatMonthDay(value: Date) {
  return `${value.getMonth() + 1}/${value.getDate()}`;
}

function isSameCalendarDay(left: Date, right: Date) {
  return startOfTaskDay(left).getTime() === startOfTaskDay(right).getTime();
}

function createEmptyCalendarDaySummary(): CalendarDaySummary {
  return { total: 0, done: 0, inProgress: 0, todo: 0, overdue: 0, statusDots: [] };
}

function formatCalendarDayAriaLabel(day: CalendarDay) {
  const { summary } = day;
  if (!summary.total) return `${day.dateParam}，无任务`;

  const details = [
    summary.done ? `已完成 ${summary.done} 项` : "",
    summary.inProgress ? `进行中 ${summary.inProgress} 项` : "",
    summary.todo ? `待开始 ${summary.todo} 项` : "",
    summary.overdue ? `其中逾期 ${summary.overdue} 项` : "",
  ].filter(Boolean);

  return `${day.dateParam}，共 ${summary.total} 项任务，${details.join("，")}`;
}
