"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { DataEmptyState } from "@/shared/components/common/data-empty-state";
import { PageToolbarTemporalContext } from "@/shared/components/layout/page-toolbar-context";

import { CalendarDayAgenda } from "@/features/calendar/components/calendar-day-agenda";
import { TaskQuickViewDialog } from "@/features/tasks/components/task-quick-view-dialog";
import type { TaskFormValues } from "@/features/tasks/schemas/task-schema";
import type { Task, TaskPriority } from "@/features/tasks/types/task.types";
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
import { useToast } from "@/shared/providers/toast-provider";
import { useCalendarTasks } from "@/features/calendar/hooks/use-calendar-tasks";
import type { TaskAttentionCounts } from "@/features/tasks/types/task-query";
import { PageToolbar } from "@/shared/components/layout/page-toolbar";

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
  const { showToast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dateParam = parseCalendarDate(searchParams.get(CALENDAR_QUERY_KEYS.date) ?? initialDate);
  const range = parseCalendarRange(searchParams.get(CALENDAR_QUERY_KEYS.range) ?? initialRange);
  const pendingAgendaDate = useRef<string | null>(null);
  const previewTaskId = searchParams.get(CALENDAR_QUERY_KEYS.task);
  const selectedDate = useMemo(() => parseTaskDateParam(dateParam) ?? startOfTaskDay(new Date()), [dateParam]);
  const monthGridStart = useMemo(() => getCalendarGridStart(selectedDate), [selectedDate]);
  const rangeFrom = formatTaskDateParam(monthGridStart);
  const rangeTo = formatTaskDateParam(addTaskDays(monthGridStart, 42));

  const {
    tasks,
    hasAnyTasks,
    attention: attentionCounts,
    isLoading,
    error,
    reload,
    createTask,
    updateTask,
    updateTaskStatus,
    deleteTask,
    executeEvolution,
  } = useCalendarTasks({ from: rangeFrom, to: rangeTo });
  const isSyncing = isLoading;
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
  const isAccountEmpty = !isLoading && !hasAnyTasks;

  useEffect(() => {
    if (pendingAgendaDate.current !== dateParam || error) return;
    pendingAgendaDate.current = null;
    revealDayAgenda();
  }, [dateParam, error]);

  const handleSelectDay = (nextDate: string) => {
    if (!window.matchMedia("(max-width: 1023px)").matches) return;
    pendingAgendaDate.current = nextDate === dateParam ? null : nextDate;
    if (nextDate === dateParam) revealDayAgenda();
  };

  const updateCalendar = (input: { date?: string; range?: DashboardRangeValue }) => {
    pendingAgendaDate.current = null;
    const params = new URLSearchParams(searchParams.toString());
    params.set(CALENDAR_QUERY_KEYS.date, input.date ?? dateParam);
    params.set(CALENDAR_QUERY_KEYS.range, input.range ?? range);
    params.delete(CALENDAR_QUERY_KEYS.drawer);
    params.delete(CALENDAR_QUERY_KEYS.task);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const openTaskPreview = useCallback(
    (task: Task) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete(CALENDAR_QUERY_KEYS.drawer);
      params.set(CALENDAR_QUERY_KEYS.task, task.id);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const closeTaskPreview = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(CALENDAR_QUERY_KEYS.task);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  const handleCreateTask = async (values: TaskFormValues) => {
    try {
      const refreshed = await createTask(values);
      showToast({
        title: "任务已创建",
        description: refreshed
          ? `“${values.title}” 已添加到 ${values.dueDate || dateParam}。`
          : "任务已保存，但日历刷新失败，请稍后重试。",
        tone: refreshed ? "success" : "info",
      });
    } catch (error) {
      showToast({
        title: "创建任务失败",
        description: error instanceof Error ? error.message : "请稍后再试。",
        tone: "error",
      });
      throw error;
    }
  };

  const handleUpdateTask = async (task: Task, values: TaskFormValues) => {
    try {
      const refreshed = await updateTask(task.id, values);
      showToast({
        title: "任务已更新",
        description: refreshed ? `“${values.title}” 的修改已保存。` : "修改已保存，但日历刷新失败，请稍后重试。",
        tone: refreshed ? "success" : "info",
      });
    } catch (error) {
      showToast({
        title: "更新失败",
        description: error instanceof Error ? error.message : "请稍后再试。",
        tone: "error",
      });
      throw error;
    }
  };

  const handleToggleTaskComplete = async (task: Task) => {
    const status = task.status === "done" ? "todo" : "done";
    try {
      const refreshed = await updateTaskStatus(task.id, status);
      showToast({
        title: "状态已更新",
        description: refreshed
          ? `“${task.title}” 已标记为${status === "done" ? "已完成" : "待开始"}。`
          : "状态已保存，但日历刷新失败，请稍后重试。",
        tone: refreshed ? "success" : "info",
      });
    } catch (error) {
      showToast({
        title: "状态更新失败",
        description: error instanceof Error ? error.message : "请稍后再试。",
        tone: "error",
      });
    }
  };

  const handleDeleteTask = async (task: Task) => {
    try {
      const refreshed = await deleteTask(task.id);
      closeTaskPreview();
      showToast({
        title: "任务已删除",
        description: refreshed ? `“${task.title}” 已从当前日期移除。` : "任务已删除，但日历刷新失败。",
        tone: refreshed ? "success" : "info",
      });
    } catch (error) {
      showToast({
        title: "删除失败",
        description: error instanceof Error ? error.message : "请稍后再试。",
        tone: "error",
      });
      throw error;
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
          selectedTaskCount={selectedDaySummary.total}
          selectedDoneCount={selectedDaySummary.done}
          upcomingCount={upcomingTasks.length}
          overdueCount={attentionCounts.overdueCount}
          nearDueCount={attentionCounts.nearDueCount}
          onDateChange={(nextDate) => updateCalendar({ date: formatTaskDateParam(nextDate) })}
          onRangeChange={(nextRange) => updateCalendar({ range: nextRange })}
        />
        <DataEmptyState
          title="日历加载失败"
          description={error}
          action={
            <button type="button" className="tesla-action tesla-action--secondary" onClick={() => void reload()}>
              重试加载
            </button>
          }
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
        selectedTaskCount={selectedDaySummary.total}
        selectedDoneCount={selectedDaySummary.done}
        upcomingCount={upcomingTasks.length}
        overdueCount={attentionCounts.overdueCount}
        nearDueCount={attentionCounts.nearDueCount}
        onDateChange={(nextDate) => updateCalendar({ date: formatTaskDateParam(nextDate) })}
        onRangeChange={(nextRange) => updateCalendar({ range: nextRange })}
      />
      {attention ? <CalendarAttentionBar attention={attention} /> : null}
      <div className="calendar-layout-grid">
        <CalendarMonthGrid days={monthDays} range={range} selectedDate={selectedDate} onSelectDay={handleSelectDay} />
        <CalendarDayAgenda
          date={selectedDate}
          dateParam={dateParam}
          tasks={selectedDayTasks}
          summary={selectedDaySummary}
          isLoading={isLoading}
          onCreateTask={handleCreateTask}
          onPreviewTask={openTaskPreview}
        />
      </div>
      <div className="calendar-layout-grid">
        {range !== DASHBOARD_RANGE_VALUES.today && !isAccountEmpty ? (
          <CalendarUpcomingPanel
            tasks={upcomingTasks}
            range={range}
            rangeLabel={rangeLabel}
            selectedDate={selectedDate}
            isSyncing={isSyncing}
          />
        ) : null}
        <CalendarQuickLinks />
      </div>
      <TaskQuickViewDialog
        task={previewTask}
        onExecuteEvolution={(task, command) => executeEvolution(task.id, command)}
        onClose={closeTaskPreview}
        onUpdateTask={handleUpdateTask}
        onToggleComplete={handleToggleTaskComplete}
        onDelete={handleDeleteTask}
      />
    </section>
  );
}

function revealDayAgenda() {
  if (!window.matchMedia("(max-width: 1023px)").matches) return;
  const agenda = document.getElementById("calendar-day-agenda");
  agenda?.focus({ preventScroll: true });
  agenda?.scrollIntoView({ block: "start" });
}

export function CalendarToolbar({
  date,
  dateParam,
  range,
  rangeLabel,
  isSyncing,
  isAccountEmpty,
  selectedTaskCount = 0,
  selectedDoneCount = 0,
  upcomingCount = 0,
  overdueCount = 0,
  nearDueCount = 0,
  onDateChange,
  onRangeChange,
}: {
  date: Date;
  dateParam: string;
  range: DashboardRangeValue;
  rangeLabel: string;
  isSyncing: boolean;
  isAccountEmpty: boolean;
  selectedTaskCount?: number;
  selectedDoneCount?: number;
  upcomingCount?: number;
  overdueCount?: number;
  nearDueCount?: number;
  onDateChange: (date: Date) => void;
  onRangeChange: (range: DashboardRangeValue) => void;
}) {
  const statusLabel = isSyncing ? "同步中" : isAccountEmpty ? "暂无任务" : null;
  const selectedProgress = selectedTaskCount ? Math.round((selectedDoneCount / selectedTaskCount) * 100) : 0;
  const hasRisk = !isSyncing && overdueCount > 0;
  const hasNearDue = !hasRisk && !isSyncing && nearDueCount > 0;
  const loadSummary = isSyncing
    ? "正在同步日程"
    : selectedTaskCount
      ? `${selectedDoneCount}/${selectedTaskCount} 项完成${upcomingCount ? ` · ${upcomingCount} 项即将到期` : ""}`
      : "当前日期暂无安排";

  return (
    <PageToolbar
      accessibleTitle="日历"
      className={
        hasRisk ? "calendar-toolbar is-risk" : hasNearDue ? "calendar-toolbar is-near-due" : "calendar-toolbar"
      }
      context={
        <div className="calendar-toolbar__context">
          <div className="calendar-toolbar__identity">
            <span className="calendar-toolbar__eyebrow">CALENDAR FLOW</span>
            <strong>日程安排</strong>
          </div>
          <PageToolbarTemporalContext
            rangeLabel={rangeLabel}
            statusLabel={statusLabel ?? undefined}
            trailing={
              <Link
                className="calendar-toolbar__date-context"
                href={buildCalendarHref({ date: dateParam, range })}
                aria-label={`${dateParam} ${rangeLabel}`}
              >
                <time dateTime={dateParam}>{dateParam}</time>
              </Link>
            }
          />
        </div>
      }
      controls={
        <div className="calendar-toolbar__controls">
          <div className="calendar-toolbar__load" aria-live="polite">
            <span className="calendar-toolbar__load-meter" aria-hidden="true">
              <span style={{ width: `${selectedProgress}%` }} />
            </span>
            <span className="calendar-toolbar__load-summary">{loadSummary}</span>
            {hasRisk ? <b className="calendar-toolbar__risk-label">{overdueCount} 项逾期</b> : null}
            {!hasRisk && hasNearDue ? <b className="calendar-toolbar__near-label">{nearDueCount} 项临近</b> : null}
          </div>
          <div className="calendar-range-tabs" role="group" aria-label="日历范围">
            {rangeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={
                  range === option.value ? "calendar-range-tabs__button is-active" : "calendar-range-tabs__button"
                }
                aria-pressed={range === option.value}
                onClick={() => onRangeChange(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="calendar-date-nav" role="group" aria-label="日期切换">
            <button
              type="button"
              className="page-toolbar__icon-button"
              onClick={() => onDateChange(shiftCalendarMonth(date, -1))}
              aria-label="上个月"
              title="上个月"
            >
              <ChevronLeft aria-hidden="true" />
            </button>
            <button
              type="button"
              className="page-toolbar__control"
              aria-label="回到今天"
              onClick={() => onDateChange(new Date())}
            >
              今天
            </button>
            <button
              type="button"
              className="page-toolbar__icon-button"
              onClick={() => onDateChange(shiftCalendarMonth(date, 1))}
              aria-label="下个月"
              title="下个月"
            >
              <ChevronRight aria-hidden="true" />
            </button>
          </div>
        </div>
      }
    />
  );
}

type CalendarAttention = TaskAttentionCounts;

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
  onSelectDay,
}: {
  days: CalendarDay[];
  range: DashboardRangeValue;
  selectedDate: Date;
  onSelectDay: (dateParam: string) => void;
}) {
  return (
    <section className="calendar-panel calendar-month-panel card-surface" aria-labelledby="calendar-month-heading">
      <div className="calendar-panel__head calendar-panel__head--inline">
        <h2 id="calendar-month-heading">{formatCalendarMonth(selectedDate)}</h2>
        <CalendarStatusLegend />
      </div>
      <div className="calendar-weekday-row" aria-hidden="true">
        {weekdayLabels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      <div className="calendar-month-grid" aria-label={`${formatCalendarMonth(selectedDate)}日期`}>
        {days.map((day) => (
          <Link
            key={day.dateParam}
            href={buildCalendarHref({ date: day.dateParam, range })}
            scroll={false}
            prefetch={false}
            onNavigate={() => onSelectDay(day.dateParam)}
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
            <time className="calendar-month-day__number" dateTime={day.dateParam}>
              {day.dayLabel}
            </time>
            {day.summary.total ? (
              <span className="calendar-month-day__summary" aria-hidden="true">
                <span className="calendar-status-dots">
                  {day.summary.statusDots.map((status) => (
                    <span key={status} className={`calendar-status-dot calendar-status-dot--${status}`} />
                  ))}
                </span>
                <small className="calendar-month-day__count">
                  {day.summary.total}
                  <span> 项</span>
                </small>
              </span>
            ) : null}
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
  if (range === DASHBOARD_RANGE_VALUES.today) return [];
  const activeTasks = dueTasks.filter((task) => task.status !== "done");
  const start = addTaskDays(startOfTaskDay(selectedDate), 1);
  const end = addTaskDays(startOfTaskDay(selectedDate), range === DASHBOARD_RANGE_VALUES.all ? 30 : 7);

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

function isSameCalendarDay(left: Date, right: Date) {
  return startOfTaskDay(left).getTime() === startOfTaskDay(right).getTime();
}

function createEmptyCalendarDaySummary(): CalendarDaySummary {
  return { total: 0, done: 0, inProgress: 0, todo: 0, overdue: 0, statusDots: [] };
}

function formatCalendarDayAriaLabel(day: CalendarDay) {
  const { summary } = day;
  const dateLabel = `${day.dateParam}${day.isToday ? "，今天" : ""}${day.isCurrentMonth ? "" : "，非本月"}`;
  if (!summary.total) return `${dateLabel}，无任务`;

  const details = [
    summary.done ? `已完成 ${summary.done} 项` : "",
    summary.inProgress ? `进行中 ${summary.inProgress} 项` : "",
    summary.todo ? `待开始 ${summary.todo} 项` : "",
    summary.overdue ? `其中逾期 ${summary.overdue} 项` : "",
  ].filter(Boolean);

  return `${dateLabel}，共 ${summary.total} 项任务，${details.join("，")}`;
}
