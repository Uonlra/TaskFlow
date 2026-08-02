"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { DataEmptyState } from "@/shared/components/common/data-empty-state";

import type { Task, TaskPriority, TaskStatus } from "@/features/tasks/types/task.types";
import {
  addTaskDays,
  filterTasksByTaskDateRange,
  formatTaskDateParam,
  getTaskWeekStart,
  hasTaskDueDate,
  isTaskDueInWeek,
  isTaskDueOnDate,
  parseTaskDateParam,
  parseTaskDueDate,
  startOfTaskDay,
} from "@/features/tasks/utils/task-date-filters";
import { getTaskDueMeta } from "@/features/tasks/utils/task-deadline";
import {
  buildCalendarHref,
  buildTasksHref,
  CALENDAR_QUERY_KEYS,
  DASHBOARD_RANGE_VALUES,
  type BuildTasksHrefInput,
  type DashboardRangeValue,
} from "@/shared/lib/constants/query-params";
import { WorkspaceAuthCheckingNotice, WorkspaceStateNotice } from "@/features/auth/components/workspace-state-notice";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { getWorkspaceState } from "@/features/auth/utils/workspace-state";
import { useTaskStore } from "@/features/tasks/store/task-store";

type CalendarClientProps = {
  initialDate: string;
  initialRange: DashboardRangeValue;
};

type CalendarMetric = {
  label: string;
  value: string;
  helper: string;
  tone: "blue" | "green" | "orange" | "red" | "purple";
  href: string;
};

type CalendarDay = {
  date: Date;
  dateParam: string;
  weekday: string;
  dayLabel: string;
  isToday: boolean;
  isSelected: boolean;
  taskCount: number;
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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tasks = useTaskStore((state) => state.tasks);
  const isLoading = useTaskStore((state) => state.isLoading);
  const lastLoadedUserId = useTaskStore((state) => state.lastLoadedUserId);
  const syncTasks = useTaskStore((state) => state.syncTasks);

  useEffect(() => {
    if (isConfigured && user?.id && lastLoadedUserId !== user.id) {
      void syncTasks(user.id);
    }
  }, [isConfigured, lastLoadedUserId, syncTasks, user?.id]);

  const dateParam = parseCalendarDate(searchParams.get(CALENDAR_QUERY_KEYS.date) ?? initialDate);
  const range = parseCalendarRange(searchParams.get(CALENDAR_QUERY_KEYS.range) ?? initialRange);
  const selectedDate = useMemo(() => parseTaskDateParam(dateParam) ?? startOfTaskDay(new Date()), [dateParam]);
  const workspaceState = getWorkspaceState({
    isAuthLoading,
    isTaskLoading: isLoading,
    taskCount: tasks.length,
    userId: user?.id,
  });
  const isSyncing = workspaceState === "syncing";
  const dueTasks = useMemo(() => tasks.filter(hasValidDueDate), [tasks]);
  const scopedTasks = useMemo(() => filterTasksByRange(dueTasks, range, selectedDate), [dueTasks, range, selectedDate]);
  const selectedDayTasks = useMemo(
    () => sortCalendarTasks(dueTasks.filter((task) => isTaskDueOnDate(task, selectedDate))),
    [dueTasks, selectedDate],
  );
  const weekDays = useMemo(() => buildWeekDays(selectedDate, dueTasks), [dueTasks, selectedDate]);
  const upcomingTasks = useMemo(() => buildUpcomingTasks(dueTasks, selectedDate, range), [dueTasks, range, selectedDate]);
  const rangeLabel = rangeOptions.find((item) => item.value === range)?.label ?? "本周";
  const metrics = useMemo(() => buildCalendarMetrics(dueTasks, scopedTasks, selectedDate, dateParam, range), [dateParam, dueTasks, range, scopedTasks, selectedDate]);
  const isAccountEmpty = workspaceState === "account-empty";
  const isRangeEmpty = isAccountEmpty || (workspaceState === "ready" && scopedTasks.length === 0);

  const updateCalendar = (input: { date?: string; range?: DashboardRangeValue }) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(CALENDAR_QUERY_KEYS.date, input.date ?? dateParam);
    params.set(CALENDAR_QUERY_KEYS.range, input.range ?? range);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  if (workspaceState === "auth-checking") return <WorkspaceAuthCheckingNotice />;
  if (workspaceState === "guest") {
    return (
      <WorkspaceStateNotice
        title="登录后按日期安排任务"
        description="登录后可查看截止日期、近期提醒和任务时间线。"
      />
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

  if (isRangeEmpty) {
    return (
      <section className="calendar-shell calendar-shell--empty">
        <CalendarToolbar
          date={selectedDate}
          dateParam={dateParam}
          range={range}
          rangeLabel={rangeLabel}
          isSyncing={isSyncing}
          isAccountEmpty={false}
          onDateChange={(nextDate) => updateCalendar({ date: formatTaskDateParam(nextDate) })}
          onRangeChange={(nextRange) => updateCalendar({ range: nextRange })}
        />
        <DataEmptyState
          variant="table"
          title={`${rangeLabel}暂无截止任务`}
          description="切换日期或范围，查看其他时间的任务安排。"
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
      <CalendarSummaryGrid metrics={metrics} isLoading={isSyncing} isRangeEmpty={isRangeEmpty} />
      <div className="calendar-layout-grid">
        <main className="calendar-main-stack">
          <CalendarWeekStrip days={weekDays} />
          <CalendarTimeline
            tasks={selectedDayTasks}
            selectedDate={selectedDate}
            isAccountEmpty={isAccountEmpty}
            isSyncing={isSyncing}
          />
        </main>
        <aside className="calendar-side-stack">
          <CalendarUpcomingPanel tasks={upcomingTasks} range={range} rangeLabel={rangeLabel} selectedDate={selectedDate} isSyncing={isSyncing} />
          <CalendarQuickLinks />
        </aside>
      </div>
    </section>
  );
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
        <p>{formatReadableDate(date)} · {rangeLabel}</p>
      </div>
      <div className="calendar-toolbar__controls">
        <div className="calendar-range-tabs" aria-label="日历范围">
          {rangeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={range === option.value ? "calendar-range-tabs__button is-active" : "calendar-range-tabs__button"}
              onClick={() => onRangeChange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="calendar-date-nav" aria-label="日期切换">
          <button type="button" onClick={() => onDateChange(addTaskDays(date, -1))} aria-label="上一天">
            <span aria-hidden="true">‹</span>
          </button>
          <button type="button" onClick={() => onDateChange(new Date())}>
            今天
          </button>
          <button type="button" onClick={() => onDateChange(addTaskDays(date, 1))} aria-label="下一天">
            <span aria-hidden="true">›</span>
          </button>
        </div>
        <Link className="calendar-toolbar__date-link" href={buildCalendarHref({ date: dateParam, range })}>
          {dateParam}
        </Link>
      </div>
    </section>
  );
}

function CalendarSummaryGrid({
  metrics,
  isLoading,
  isRangeEmpty,
}: {
  metrics: CalendarMetric[];
  isLoading: boolean;
  isRangeEmpty: boolean;
}) {
  return (
    <section className="calendar-overview card-surface" aria-label="日历摘要">
      {metrics.map((metric) => (
        <Link key={metric.label} href={metric.href} className={`calendar-metric calendar-metric--${metric.tone}`}>
          <span className="calendar-metric__icon" aria-hidden="true" />
          <div>
            <span>{metric.label}</span>
            <strong>{isLoading ? "--" : metric.value}</strong>
            <small>{isRangeEmpty ? "当前范围" : metric.helper}</small>
          </div>
        </Link>
      ))}
    </section>
  );
}

function CalendarWeekStrip({ days }: { days: CalendarDay[] }) {
  return (
    <section className="calendar-panel calendar-week-panel card-surface">
      <div className="calendar-panel__head calendar-panel__head--inline">
        <div>
          <span className="calendar-eyebrow">周视图</span>
          <h2>7 天任务分布</h2>
        </div>
        <Link href={buildTasksHref({ date: days.find((day) => day.isSelected)?.dateParam, range: DASHBOARD_RANGE_VALUES.week })}>查看任务</Link>
      </div>
      <div className="calendar-week-strip" aria-label="周视图日期">
        {days.map((day) => (
          <Link
            key={day.dateParam}
            href={buildCalendarHref({ date: day.dateParam, range: DASHBOARD_RANGE_VALUES.week })}
            className={[
              "calendar-day",
              day.isSelected ? "is-selected" : "",
              day.isToday ? "is-today" : "",
            ].filter(Boolean).join(" ")}
          >
            <span>{day.weekday}</span>
            <strong>{day.dayLabel}</strong>
            <small>{day.taskCount} 截止</small>
          </Link>
        ))}
      </div>
    </section>
  );
}

function CalendarTimeline({
  tasks,
  selectedDate,
  isAccountEmpty,
  isSyncing,
}: {
  tasks: Task[];
  selectedDate: Date;
  isAccountEmpty: boolean;
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
    <Link href={getTaskCalendarHref(task)} className={`calendar-timeline__item calendar-timeline__item--${task.priority}${task.status === "done" ? " is-done" : ""}`}>
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
              <Link key={task.id} href={getTaskCalendarHref(task)} className={`calendar-task-row calendar-task-row--${task.priority}`}>
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

function buildCalendarTasksHref(
  dateParam: string,
  range: DashboardRangeValue,
  input: BuildTasksHrefInput = {},
) {
  if (range === DASHBOARD_RANGE_VALUES.all) {
    return buildTasksHref({ ...input, range });
  }

  if (range === DASHBOARD_RANGE_VALUES.week) {
    return buildTasksHref({ ...input, date: dateParam, range });
  }

  return buildTasksHref({ ...input, date: dateParam });
}
function buildCalendarMetrics(dueTasks: Task[], scopedTasks: Task[], selectedDate: Date, dateParam: string, range: DashboardRangeValue): CalendarMetric[] {
  const activeDueTasks = dueTasks.filter((task) => task.status !== "done");
  const activeScopedTasks = scopedTasks.filter((task) => task.status !== "done");
  const selectedDayCount = activeDueTasks.filter((task) => isTaskDueOnDate(task, selectedDate)).length;
  const weekCount = activeDueTasks.filter((task) => isTaskDueInWeek(task, selectedDate)).length;
  const overdueCount = activeDueTasks.filter((task) => getTaskDueMeta(task).isOverdue).length;
  const highCount = activeScopedTasks.filter((task) => task.priority === "high").length;
  const completedCount = scopedTasks.filter((task) => task.status === "done").length;

  return [
    { label: "当日截止", value: String(selectedDayCount), helper: "选中日期", tone: "blue", href: buildTasksHref({ date: dateParam }) },
    { label: "本周到期", value: String(weekCount), helper: "7 天分布", tone: "green", href: buildTasksHref({ date: dateParam, range: DASHBOARD_RANGE_VALUES.week }) },
    { label: "已逾期", value: String(overdueCount), helper: "需要处理", tone: "red", href: buildTasksHref({ due: "overdue" }) },
    { label: "高优先级", value: String(highCount), helper: "当前范围", tone: "orange", href: buildCalendarTasksHref(dateParam, range, { priority: "high" }) },
    { label: "已完成", value: String(completedCount), helper: "当前范围", tone: "purple", href: buildCalendarTasksHref(dateParam, range, { status: "done" }) },
  ];
}

function buildWeekDays(selectedDate: Date, dueTasks: Task[]): CalendarDay[] {
  const start = getTaskWeekStart(selectedDate);
  const today = startOfTaskDay(new Date());

  return Array.from({ length: 7 }, (_, index) => {
    const date = addTaskDays(start, index);
    return {
      date,
      dateParam: formatTaskDateParam(date),
      weekday: formatWeekday(date),
      dayLabel: String(date.getDate()),
      isToday: isSameCalendarDay(date, today),
      isSelected: isSameCalendarDay(date, selectedDate),
      taskCount: dueTasks.filter((task) => task.status !== "done" && isTaskDueOnDate(task, date)).length,
    };
  });
}

function buildUpcomingTasks(dueTasks: Task[], selectedDate: Date, range: DashboardRangeValue) {
  const activeTasks = dueTasks.filter((task) => task.status !== "done");
  const start = startOfTaskDay(selectedDate);
  const end = range === DASHBOARD_RANGE_VALUES.all ? addTaskDays(start, 30) : addTaskDays(start, range === DASHBOARD_RANGE_VALUES.today ? 1 : 7);

  return sortCalendarTasks(
    activeTasks.filter((task) => {
      const dueDate = parseTaskDueDate(task);
      return dueDate && dueDate >= start && dueDate < end;
    }),
  ).slice(0, 6);
}

function filterTasksByRange(tasks: Task[], range: DashboardRangeValue, selectedDate: Date) {
  return sortCalendarTasks(filterTasksByTaskDateRange(tasks, { date: selectedDate, range }));
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

    return (parseTaskDueDate(left)?.getTime() ?? Number.POSITIVE_INFINITY) - (parseTaskDueDate(right)?.getTime() ?? Number.POSITIVE_INFINITY);
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

function formatReadableDate(value: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).format(value);
}

function formatMonthDay(value: Date) {
  return `${value.getMonth() + 1}/${value.getDate()}`;
}

function formatWeekday(value: Date) {
  return new Intl.DateTimeFormat("zh-CN", { weekday: "short" }).format(value).replace("周", "");
}

function isSameCalendarDay(left: Date, right: Date) {
  return startOfTaskDay(left).getTime() === startOfTaskDay(right).getTime();
}

