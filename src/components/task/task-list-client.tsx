"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { DesktopTaskWorkbench } from "@/components/task/desktop-task-workbench";
import type { TaskFilters } from "@/components/task/task-filter-bar";
import { MobileTaskListView } from "@/components/task/mobile-task-list-view";
import { TaskSignalPanel } from "@/components/task/task-signal-panel";
import type { TaskFormValues } from "@/features/tasks/schemas/task-schema";
import type { Task } from "@/features/tasks/types/task.types";
import { getTaskDueMeta, sortTasks } from "@/features/tasks/utils/task-deadline";
import {
  DASHBOARD_RANGE_VALUES,
  TASK_DUE_FILTERS,
  TASK_QUERY_KEYS,
  TASK_RISK_FILTERS,
  type DashboardRangeValue,
  type TaskDueFilter,
  type TaskRiskFilter,
} from "@/lib/constants/query-params";
import { useAuth } from "@/providers/auth-provider";
import { useToast } from "@/providers/toast-provider";
import { useTaskStore } from "@/store/task-store";

const initialFilters: TaskFilters = {
  query: "",
  tag: "",
  status: "all",
  priority: "all",
  due: "",
  risk: "",
  date: "",
  range: "",
  sort: "due_asc",
};

type TaskListClientProps = {
  initialFilters?: TaskFilters;
};

export function TaskListClient({ initialFilters: initialFiltersProp = initialFilters }: TaskListClientProps) {
  const { user, isConfigured } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const [filters, setFilters] = useState<TaskFilters>(initialFiltersProp);
  const tasks = useTaskStore((state) => state.tasks);
  const isLoading = useTaskStore((state) => state.isLoading);
  const error = useTaskStore((state) => state.error);
  const lastLoadedUserId = useTaskStore((state) => state.lastLoadedUserId);
  const syncTasks = useTaskStore((state) => state.syncTasks);
  const createTask = useTaskStore((state) => state.createTask);
  const createTaskAsync = useTaskStore((state) => state.createTaskAsync);
  const updateTask = useTaskStore((state) => state.updateTask);
  const updateTaskStatus = useTaskStore((state) => state.updateTaskStatus);
  const deleteTask = useTaskStore((state) => state.deleteTask);

  useEffect(() => {
    if (isConfigured && user?.id && lastLoadedUserId !== user.id) {
      void syncTasks(user.id);
    }
  }, [isConfigured, lastLoadedUserId, syncTasks, user?.id]);

  useEffect(() => {
    const nextFilters = parseTaskFilters({
      query: searchParams.get("query"),
      tag: searchParams.get("tag"),
      status: searchParams.get("status"),
      priority: searchParams.get("priority"),
      due: searchParams.get("due"),
      risk: searchParams.get("risk"),
      date: searchParams.get("date"),
      range: searchParams.get("range"),
      sort: searchParams.get("sort"),
    });

    setFilters((current) => (areFiltersEqual(current, nextFilters) ? current : nextFilters));
  }, [searchParams]);

  const filteredTasks = useMemo(() => {
    const nextTasks = tasks.filter((task) => {
      const matchQuery =
        !filters.query ||
        task.title.toLowerCase().includes(filters.query.toLowerCase()) ||
        task.description.toLowerCase().includes(filters.query.toLowerCase()) ||
        (task.tags ?? []).some((tag) => tag.toLowerCase().includes(filters.query.toLowerCase()));

      const matchTag = !filters.tag || (task.tags ?? []).some((tag) => tag.toLowerCase().includes(filters.tag.toLowerCase()));

      const matchStatus = filters.status === "all" || task.status === filters.status;
      const matchPriority = filters.priority === "all" || task.priority === filters.priority;
      const hasDateRangeFilter = hasActiveDateRangeFilter(filters.date, filters.range);
      const matchDateRange = matchesDateRangeFilter(task, filters.date, filters.range);
      const matchDue = hasDateRangeFilter || !filters.due || matchesDueFilter(task, filters.due);
      const matchRisk = !filters.risk || matchesRiskFilter(task, filters.risk);

      return matchQuery && matchTag && matchStatus && matchPriority && matchDateRange && matchDue && matchRisk;
    });

    return sortTasks(nextTasks, filters.sort);
  }, [filters, tasks]);

  const deadlineSummary = useMemo(() => {
    return tasks.reduce(
      (summary, task) => {
        const dueMeta = getTaskDueMeta(task);

        if (dueMeta.isOverdue) {
          summary.overdue += 1;
        }

        if (dueMeta.isDueToday) {
          summary.today += 1;
        }

        if (dueMeta.isUpcoming) {
          summary.upcoming += 1;
        }

        return summary;
      },
      { overdue: 0, today: 0, upcoming: 0 },
    );
  }, [tasks]);

  const hasActiveFilters =
    filters.query.trim() !== "" ||
    filters.tag.trim() !== "" ||
    filters.status !== "all" ||
    filters.priority !== "all" ||
    filters.due !== "" ||
    filters.risk !== "" ||
    filters.date !== "" ||
    filters.range !== "" ||
    filters.sort !== "due_asc";
  const activeFilterLabels = useMemo(() => buildActiveFilterLabels(filters), [filters]);

  const handleCreateTask = async (values: TaskFormValues) => {
    try {
      if (isConfigured) {
        await createTaskAsync(values, user?.id);
      } else {
        createTask(values);
      }

      showToast({
        title: "任务已创建",
        description: `“${values.title}” 已经记下来了。`,
        tone: "success",
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

  const handleUpdateTask = async (id: string, values: TaskFormValues) => {
    try {
      await updateTask(id, values, user?.id);
      showToast({
        title: "任务已更新",
        description: `“${values.title}” 已更新，改动存好了。`,
        tone: "success",
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

  const handleUpdateStatus = async (id: string, status: "todo" | "in_progress" | "done") => {
    try {
      await updateTaskStatus(id, status, user?.id);
      showToast({
        title: "状态已更新",
        description: `任务已切换为${status === "todo" ? "待开始" : status === "in_progress" ? "进行中" : "已完成"}。`,
        tone: "success",
      });
    } catch (error) {
      showToast({
        title: "状态更新失败",
        description: error instanceof Error ? error.message : "请稍后再试。",
        tone: "error",
      });
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await deleteTask(id, user?.id);
      showToast({
        title: "任务已删除",
        description: "这条任务已经从任务本里移除。",
        tone: "success",
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

  const handleFiltersChange = (nextFilters: TaskFilters) => {
    setFilters(nextFilters);

    const params = new URLSearchParams(searchParams.toString());

    syncParam(params, TASK_QUERY_KEYS.query, nextFilters.query, "");
    syncParam(params, TASK_QUERY_KEYS.tag, nextFilters.tag, "");
    syncParam(params, TASK_QUERY_KEYS.status, nextFilters.status, "all");
    syncParam(params, TASK_QUERY_KEYS.priority, nextFilters.priority, "all");
    syncParam(params, TASK_QUERY_KEYS.due, nextFilters.due, "");
    syncParam(params, TASK_QUERY_KEYS.risk, nextFilters.risk, "");
    syncParam(params, TASK_QUERY_KEYS.date, nextFilters.date, "");
    syncParam(params, TASK_QUERY_KEYS.range, nextFilters.range, "");
    syncParam(params, TASK_QUERY_KEYS.sort, nextFilters.sort, "due_asc");

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const handleResetFilters = () => {
    handleFiltersChange(initialFilters);
  };

  const summaryLabel = !tasks.length
    ? "先加一条任务吧，别都放脑子里打转。"
    : hasActiveFilters
      ? `筛出了 ${filteredTasks.length} 条，先看这些就够了。`
      : `一共有 ${tasks.length} 条任务，可以先看快到期或正在做的。`;
  const signalTitle = hasActiveFilters ? "当前筛选视图已锁定" : "任务队列正在待命";
  const signalDescription = hasActiveFilters
    ? "下面这批任务已经按你的条件收窄，先处理它们，别让注意力到处散步。"
    : "搜索、筛选和状态灯一起工作。你只管把任务放进来，剩下的节奏让界面帮你提醒。";
  const motionKey = `${filters.query}|${filters.tag}|${filters.status}|${filters.priority}|${filters.due}|${filters.risk}|${filters.date}|${filters.range}|${filters.sort}|${filteredTasks.map((task) => `${task.id}:${task.status}`).join(",")}`;

  return (
    <>
      <div className="tasks-mobile-only">
        <MobileTaskListView
          tasks={filteredTasks}
          totalCount={tasks.length}
          filters={filters}
          isLoading={isConfigured && isLoading}
          onFiltersChange={handleFiltersChange}
          onCreateTask={handleCreateTask}
          onUpdateStatus={handleUpdateStatus}
        />
      </div>
      <section className="tasks-toolbar tasks-desktop-only">
        {activeFilterLabels.length ? (
          <section className="task-url-filters card-surface" aria-label="当前筛选">
            <div className="task-url-filters__chips">
              {activeFilterLabels.map((label) => (
                <span key={label} className="task-url-filters__chip">{label}</span>
              ))}
            </div>
            <button type="button" className="task-url-filters__clear" onClick={handleResetFilters}>
              清除筛选
            </button>
          </section>
        ) : null}
        {!isConfigured ? (
          <section className="notice-card card-surface">
            <p>还没连 Appwrite，所以任务先存在浏览器本地，够用，但别太飘。</p>
          </section>
        ) : null}
        {error ? (
          <section className="notice-card notice-card--error card-surface">
            <p>{error}</p>
          </section>
        ) : null}
        <DesktopTaskWorkbench
          tasks={filteredTasks}
          totalTasks={tasks}
          filters={filters}
          isLoading={isConfigured && isLoading}
          onFiltersChange={handleFiltersChange}
          onResetFilters={handleResetFilters}
          onCreateTask={handleCreateTask}
          onUpdateTask={handleUpdateTask}
          onUpdateStatus={handleUpdateStatus}
          onDeleteTask={handleDeleteTask}
        />
      </section>
    </>
  );
}

function parseTaskFilters(input: Partial<Record<keyof TaskFilters, string | null | undefined>>): TaskFilters {
  const status = input.status === "todo" || input.status === "in_progress" || input.status === "done" ? input.status : "all";
  const priority = input.priority === "low" || input.priority === "medium" || input.priority === "high" ? input.priority : "all";
  const due =
    input.due === TASK_DUE_FILTERS.near ||
    input.due === TASK_DUE_FILTERS.today ||
    input.due === TASK_DUE_FILTERS.upcoming ||
    input.due === TASK_DUE_FILTERS.overdue
      ? input.due
      : "";
  const risk =
    input.risk === TASK_RISK_FILTERS.overdue ||
    input.risk === TASK_RISK_FILTERS.high ||
    input.risk === TASK_RISK_FILTERS.medium ||
    input.risk === TASK_RISK_FILTERS.low
      ? input.risk
      : "";
  const sort =
    input.sort === "created_desc" ||
    input.sort === "updated_desc" ||
    input.sort === "priority_desc" ||
    input.sort === "due_asc"
      ? input.sort
      : "due_asc";
  const date = parseTaskDateParam(input.date);
  const parsedRange = parseTaskRange(input.range);
  const range = date || parsedRange === DASHBOARD_RANGE_VALUES.all ? parsedRange : "";

  return {
    query: input.query ?? "",
    tag: input.tag ?? "",
    status,
    priority,
    due,
    risk,
    date,
    range,
    sort,
  };
}

function syncParam(params: URLSearchParams, key: string, value: string, fallbackValue: string) {
  if (!value || value === fallbackValue) {
    params.delete(key);
    return;
  }

  params.set(key, value);
}

function areFiltersEqual(left: TaskFilters, right: TaskFilters) {
  return (
    left.query === right.query &&
    left.tag === right.tag &&
    left.status === right.status &&
    left.priority === right.priority &&
    left.due === right.due &&
    left.risk === right.risk &&
    left.date === right.date &&
    left.range === right.range &&
    left.sort === right.sort
  );
}

function matchesDueFilter(task: Task, due: TaskDueFilter) {
  if (task.status === "done") {
    return false;
  }

  const dueMeta = getTaskDueMeta(task);

  if (due === TASK_DUE_FILTERS.near) {
    return dueMeta.isDueToday || dueMeta.isUpcoming;
  }

  if (due === TASK_DUE_FILTERS.today) {
    return dueMeta.isDueToday;
  }

  if (due === TASK_DUE_FILTERS.upcoming) {
    return dueMeta.isUpcoming;
  }

  return dueMeta.isOverdue;
}

function matchesRiskFilter(task: Task, risk: TaskRiskFilter) {
  if (task.status === "done") {
    return false;
  }

  if (risk === TASK_RISK_FILTERS.overdue) {
    return getTaskDueMeta(task).isOverdue;
  }

  const offset = getDueDayOffset(task.dueDate);

  if (risk === TASK_RISK_FILTERS.high) {
    return task.priority === "high" || getTaskDueMeta(task).isOverdue;
  }

  if (risk === TASK_RISK_FILTERS.medium) {
    return task.priority === "medium" || (offset !== null && offset >= 0 && offset <= 1);
  }

  return task.priority === "low" || (offset !== null && offset >= 0 && offset <= 3);
}

function hasActiveDateRangeFilter(date: string, range: DashboardRangeValue | "") {
  return Boolean(date) && range !== DASHBOARD_RANGE_VALUES.all;
}

function matchesDateRangeFilter(task: Task, date: string, range: DashboardRangeValue | "") {
  if (!hasActiveDateRangeFilter(date, range)) {
    return true;
  }

  const selectedDate = parseDateParam(date);
  const dueDate = parseTaskDueDate(task);

  if (!selectedDate || !dueDate) {
    return false;
  }

  if (range === DASHBOARD_RANGE_VALUES.week) {
    const start = getWeekStart(selectedDate);
    return isWithinRange(dueDate, start, addDays(start, 7));
  }

  return isSameTaskDay(dueDate, selectedDate);
}

function parseTaskRange(value: string | null | undefined): DashboardRangeValue | "" {
  if (
    value === DASHBOARD_RANGE_VALUES.today ||
    value === DASHBOARD_RANGE_VALUES.week ||
    value === DASHBOARD_RANGE_VALUES.all
  ) {
    return value;
  }

  return "";
}

function parseTaskDateParam(value: string | null | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return "";
  }

  const date = parseDateParam(value);

  if (!date || formatDateParam(date) !== value) {
    return "";
  }

  return value;
}

function parseDateParam(value: string) {
  const date = startOfDay(new Date(`${value}T00:00:00`));
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseTaskDueDate(task: Task) {
  if (!task.dueDate) {
    return null;
  }

  const date = startOfDay(new Date(task.dueDate));
  return Number.isNaN(date.getTime()) ? null : date;
}

function getWeekStart(value: Date) {
  const date = startOfDay(value);
  const day = date.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  return addDays(date, offset);
}

function addDays(value: Date, days: number) {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return startOfDay(date);
}

function isSameTaskDay(left: Date, right: Date) {
  return startOfDay(left).getTime() === startOfDay(right).getTime();
}

function isWithinRange(value: Date, start: Date, end: Date) {
  const timestamp = value.getTime();
  return timestamp >= start.getTime() && timestamp < end.getTime();
}

function formatDateParam(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const date = String(value.getDate()).padStart(2, "0");

  return `${year}-${month}-${date}`;
}

function formatShortDate(value: string) {
  const [, month, date] = value.split("-");
  return `${month}/${date}`;
}

function buildActiveFilterLabels(filters: TaskFilters) {
  const labels: string[] = [];

  if (filters.query.trim()) {
    labels.push(`搜索：${filters.query.trim()}`);
  }

  if (filters.tag.trim()) {
    labels.push(`标签：${filters.tag.trim()}`);
  }

  if (filters.status !== "all") {
    labels.push(statusFilterLabels[filters.status]);
  }

  if (filters.priority !== "all") {
    labels.push(priorityFilterLabels[filters.priority]);
  }

  if (filters.due && !hasActiveDateRangeFilter(filters.date, filters.range)) {
    labels.push(dueFilterLabels[filters.due]);
  }

  if (filters.risk) {
    labels.push(riskFilterLabels[filters.risk]);
  }

  if (filters.date && filters.range !== DASHBOARD_RANGE_VALUES.all) {
    labels.push(filters.range === DASHBOARD_RANGE_VALUES.week ? `本周：${formatShortDate(filters.date)}` : `日期：${filters.date}`);
  } else if (filters.range === DASHBOARD_RANGE_VALUES.all) {
    labels.push("全部日期");
  }

  if (filters.sort !== "due_asc") {
    labels.push(sortFilterLabels[filters.sort]);
  }

  return labels;
}

function getDueDayOffset(value: string | undefined) {
  if (!value) {
    return null;
  }

  const dueDate = startOfDay(new Date(value));

  if (Number.isNaN(dueDate.getTime())) {
    return null;
  }

  const today = startOfDay(new Date());

  return Math.round((dueDate.getTime() - today.getTime()) / 86400000);
}

function startOfDay(value: Date) {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
}

const statusFilterLabels = {
  todo: "待开始",
  in_progress: "进行中",
  done: "已完成",
} as const;

const priorityFilterLabels = {
  high: "高优先级",
  medium: "中优先级",
  low: "低优先级",
} as const;

const dueFilterLabels = {
  near: "临近截止",
  today: "今天到期",
  upcoming: "即将到期",
  overdue: "已逾期",
} as const;

const riskFilterLabels = {
  overdue: "已逾期",
  high: "高风险",
  medium: "中风险",
  low: "低风险",
} as const;

const sortFilterLabels = {
  created_desc: "最新创建",
  updated_desc: "最近更新",
  priority_desc: "优先级排序",
  due_asc: "截止时间",
} as const;
