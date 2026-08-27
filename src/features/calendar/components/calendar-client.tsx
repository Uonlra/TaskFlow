"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { DataEmptyState } from "@/shared/components/common/data-empty-state";

import type { Task, TaskPriority, TaskStatus } from "@/features/tasks/types/task.types";
import {
  addTaskDays,
  filterTasksByTaskDateRange,
  formatTaskDateParam,
  hasTaskDueDate,
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

type CalendarClientProps = {
  initialDate: string;
  initialRange: DashboardRangeValue;
};

type CalendarDay = {
  date: Date;
  dateParam: string;
  weekday: string;
  dayLabel: string;
  isToday: boolean;
  isSelected: boolean;
  isCurrentMonth: boolean;
  taskCount: number;
  statusDots: CalendarStatus[];
};

type CalendarStatus = "done" | "in_progress" | "todo" | "overdue";

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
  const [tasks, setTasks] = useState<Task[]>([]);
  const [hasAnyTasks, setHasAnyTasks] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dateParam = parseCalendarDate(searchParams.get(CALENDAR_QUERY_KEYS.date) ?? initialDate);
  const range = parseCalendarRange(searchParams.get(CALENDAR_QUERY_KEYS.range) ?? initialRange);
  const selectedDate = useMemo(() => parseTaskDateParam(dateParam) ?? startOfTaskDay(new Date()), [dateParam]);
  const monthGridStart = useMemo(() => getCalendarGridStart(selectedDate), [selectedDate]);
  const rangeFrom = range === DASHBOARD_RANGE_VALUES.all ? undefined : formatTaskDateParam(monthGridStart);
  const rangeTo =
    range === DASHBOARD_RANGE_VALUES.all ? undefined : formatTaskDateParam(addTaskDays(monthGridStart, 42));

  useEffect(() => {
    if (!isConfigured || !user?.id || isAuthLoading) return;

    const params = new URLSearchParams();
    if (range === DASHBOARD_RANGE_VALUES.all) {
      params.set("range", DASHBOARD_RANGE_VALUES.all);
    } else {
      params.set("from", rangeFrom ?? dateParam);
      params.set("to", rangeTo ?? formatTaskDateParam(addTaskDays(selectedDate, 1)));
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);
    void fetch(`/api/tasks/range?${params.toString()}`)
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as {
          tasks?: Task[];
          hasAnyTasks?: boolean;
          message?: string;
        } | null;
        if (!response.ok || !payload?.tasks) {
          throw new Error(payload?.message || "无法加载日历任务。");
        }
        if (!cancelled) {
          setTasks(payload.tasks);
          setHasAnyTasks(Boolean(payload.hasAnyTasks));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTasks([]);
          setHasAnyTasks(false);
          setError("日历任务暂时无法加载，请稍后重试。");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [dateParam, isAuthLoading, isConfigured, range, rangeFrom, rangeTo, selectedDate, user?.id]);

  const workspaceState = getWorkspaceState({
    isAuthLoading,
    isTaskLoading: isLoading,
    taskCount: hasAnyTasks ? 1 : 0,
    userId: user?.id,
  });
  const isSyncing = workspaceState === "syncing";
  const dueTasks = useMemo(() => tasks.filter(hasValidDueDate), [tasks]);
  const scopedTasks = useMemo(() => filterTasksByRange(dueTasks, range, selectedDate), [dueTasks, range, selectedDate]);
  const selectedDayTasks = useMemo(
    () => sortCalendarTasks(dueTasks.filter((task) => isTaskDueOnDate(task, selectedDate))),
    [dueTasks, selectedDate],
  );
  const monthDays = useMemo(() => buildMonthDays(selectedDate, dueTasks), [dueTasks, selectedDate]);
  const upcomingTasks = useMemo(
    () => buildUpcomingTasks(dueTasks, selectedDate, range),
    [dueTasks, range, selectedDate],
  );
  const attention = useMemo(() => buildCalendarAttention(dueTasks), [dueTasks]);
  const rangeLabel = rangeOptions.find((item) => item.value === range)?.label ?? "本周";
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
      <WorkspaceStateNotice title="登录后按日期安排任务" description="登录后可查看截止日期、近期提醒和任务时间线。" />
    );
  }

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
      <div className="calendar-weekday-row" aria-hidden="true">
        {weekdayLabels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      <div className="calendar-month-grid" aria-label={`${formatCalendarMonth(selectedDate)}日期`} role="grid">
        {days.map((day) => (
          <Link
            key={day.dateParam}
            href={buildCalendarHref({ date: day.dateParam, range })}
            className={[
              "calendar-month-day",
              day.isSelected ? "is-selected" : "",
              day.isToday ? "is-today" : "",
              day.isCurrentMonth ? "" : "is-outside-month",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-current={day.isSelected ? "date" : undefined}
            aria-label={`${day.dateParam}，${day.taskCount} 项任务`}
            role="gridcell"
          >
            <span className="calendar-month-day__number">{day.dayLabel}</span>
            {day.statusDots.length ? (
              <span className="calendar-status-dots" aria-hidden="true">
                {day.statusDots.map((status) => (
                  <span key={status} className={`calendar-status-dot calendar-status-dot--${status}`} />
                ))}
              </span>
            ) : null}
            <small className="calendar-month-day__count">{day.taskCount ? `${day.taskCount} 项` : ""}</small>
          </Link>
        ))}
      </div>
    </section>
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
function buildCalendarAttention(dueTasks: Task[]): CalendarAttention | null {
  const activeTasks = dueTasks.filter((task) => task.status !== "done");
  const overdueCount = activeTasks.filter((task) => getTaskDueMeta(task).isOverdue).length;
  const nearDueCount = activeTasks.filter((task) => {
    const dueMeta = getTaskDueMeta(task);
    return dueMeta.isDueToday || dueMeta.isUpcoming;
  }).length;

  if (!overdueCount && !nearDueCount) return null;

  return { overdueCount, nearDueCount };
}

const weekdayLabels = ["一", "二", "三", "四", "五", "六", "日"];

function buildMonthDays(selectedDate: Date, dueTasks: Task[]): CalendarDay[] {
  const start = getCalendarGridStart(selectedDate);
  const today = startOfTaskDay(new Date());

  return Array.from({ length: 42 }, (_, index) => {
    const date = addTaskDays(start, index);
    const tasksForDay = dueTasks.filter((task) => isTaskDueOnDate(task, date));
    const statusDots = getCalendarStatusDots(tasksForDay);
    return {
      date,
      dateParam: formatTaskDateParam(date),
      weekday: formatWeekday(date),
      dayLabel: String(date.getDate()),
      isToday: isSameCalendarDay(date, today),
      isSelected: isSameCalendarDay(date, selectedDate),
      isCurrentMonth: date.getMonth() === selectedDate.getMonth() && date.getFullYear() === selectedDate.getFullYear(),
      taskCount: tasksForDay.length,
      statusDots,
    };
  });
}

function getCalendarGridStart(date: Date) {
  const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
  const mondayOffset = monthStart.getDay() === 0 ? 6 : monthStart.getDay() - 1;
  return addTaskDays(monthStart, -mondayOffset);
}

function getCalendarStatusDots(tasks: Task[]): CalendarStatus[] {
  const statuses = new Set<CalendarStatus>();

  tasks.forEach((task) => {
    const dueMeta = getTaskDueMeta(task);
    if (dueMeta.isOverdue) statuses.add("overdue");
    statuses.add(task.status);
  });

  return ["overdue", "in_progress", "todo", "done"]
    .filter((status) => statuses.has(status as CalendarStatus))
    .slice(0, 3) as CalendarStatus[];
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

function formatWeekday(value: Date) {
  return new Intl.DateTimeFormat("zh-CN", { weekday: "short" }).format(value).replace("周", "");
}

function isSameCalendarDay(left: Date, right: Date) {
  return startOfTaskDay(left).getTime() === startOfTaskDay(right).getTime();
}
