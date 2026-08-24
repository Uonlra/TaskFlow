"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { DesktopTaskWorkbench } from "@/features/tasks/components/desktop-task-workbench";
import type { TaskFilters } from "@/features/tasks/types/task-filters";
import { MobileTaskListView } from "@/features/tasks/components/mobile-task-list-view";
import type { TaskFormValues } from "@/features/tasks/schemas/task-schema";
import type { Task, TaskPageInitialData } from "@/features/tasks/types/task.types";
import {
  formatTaskDateParam,
  hasActiveTaskDateRangeFilter,
  parseTaskDateParam,
} from "@/features/tasks/utils/task-date-filters";
import {
  DASHBOARD_RANGE_VALUES,
  TASK_DUE_FILTERS,
  TASK_QUERY_KEYS,
  TASK_RISK_FILTERS,
  type DashboardRangeValue,
} from "@/shared/lib/constants/query-params";
import { WorkspaceAuthCheckingNotice, WorkspaceStateNotice } from "@/features/auth/components/workspace-state-notice";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { getWorkspaceState } from "@/features/auth/utils/workspace-state";
import { useToast } from "@/shared/providers/toast-provider";
import { useTaskStore } from "@/features/tasks/store/task-store";
import { DEFAULT_TASK_PAGE_SIZE, parseTaskPageParam } from "@/features/tasks/utils/task-list-query";
import { TaskQuickViewDialog } from "@/features/tasks/components/task-quick-view-dialog";

const SETTINGS_STORAGE_KEY = "u-task-settings";

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
  initialData?: TaskPageInitialData | null;
};

export function TaskListClient({
  initialFilters: initialFiltersProp = initialFilters,
  initialData = null,
}: TaskListClientProps) {
  const { user, isConfigured, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const [filters, setFilters] = useState<TaskFilters>(initialFiltersProp);
  const [pageData, setPageData] = useState<TaskPageInitialData | null>(initialData);
  const [pageLoading, setPageLoading] = useState(!initialData);
  const [pageError, setPageError] = useState<string | null>(null);
  const [previewTask, setPreviewTask] = useState<Task | null>(null);
  const createTaskAsync = useTaskStore((state) => state.createTaskAsync);
  const updateTask = useTaskStore((state) => state.updateTask);
  const updateTaskStatus = useTaskStore((state) => state.updateTaskStatus);
  const deleteTask = useTaskStore((state) => state.deleteTask);

  const page = parseTaskPageParam(searchParams.get("page"));
  const canUseInitialData = Boolean(initialData && (isAuthLoading || user?.id === initialData.userId));
  const hasConfirmedUserMismatch = Boolean(initialData && !isAuthLoading && user && user.id !== initialData.userId);
  const activeUserId = user?.id ?? (isAuthLoading ? initialData?.userId : undefined);

  const loadPage = useCallback(async () => {
    if (!activeUserId || !isConfigured) return;

    setPageLoading(true);
    setPageError(null);
    try {
      const params = buildTaskPageParams(filters, page);
      const response = await fetch(`/api/tasks?${params.toString()}`);
      const payload = (await response.json().catch(() => null)) as
        Omit<TaskPageInitialData, "userId"> | { message?: string } | null;
      if (!response.ok || !payload || !("tasks" in payload) || !("total" in payload)) {
        throw new Error((payload && "message" in payload ? payload.message : undefined) || "无法加载任务列表。");
      }
      setPageData({ userId: activeUserId, ...payload });
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "无法加载任务列表。");
    } finally {
      setPageLoading(false);
    }
  }, [activeUserId, filters, isConfigured, page]);

  useEffect(() => {
    if (hasConfirmedUserMismatch) {
      setPageData(null);
      return;
    }

    const matchesInitialData =
      initialData &&
      activeUserId === initialData.userId &&
      page === initialData.page &&
      areFiltersEqual(filters, initialFiltersProp);

    if (matchesInitialData) {
      setPageData(initialData);
      setPageLoading(false);
      return;
    }

    if (activeUserId && isConfigured && !isAuthLoading) {
      void loadPage();
    }
  }, [
    activeUserId,
    filters,
    hasConfirmedUserMismatch,
    initialData,
    initialFiltersProp,
    isAuthLoading,
    isConfigured,
    loadPage,
    page,
  ]);

  const visibleTasks = hasConfirmedUserMismatch ? [] : (pageData?.tasks ?? []);
  const totalCount = hasConfirmedUserMismatch ? 0 : (pageData?.total ?? 0);
  const categoryCounts = pageData?.categoryCounts ?? { near: 0, active: 0, done: 0, all: 0 };
  const visibleIsLoading = hasConfirmedUserMismatch || pageLoading || (isAuthLoading && !canUseInitialData);
  const error = pageError;

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

    if (!searchParams.get("sort")) {
      nextFilters.sort = getPreferredTaskSort();
    }

    setFilters((current) => (areFiltersEqual(current, nextFilters) ? current : nextFilters));
  }, [searchParams]);

  const filteredTasks = visibleTasks;

  const activeFilterLabels = useMemo(() => buildActiveFilterLabels(filters), [filters]);

  const handleCreateTask = async (values: TaskFormValues) => {
    try {
      await createTaskAsync(values, activeUserId);
      await loadPage();

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

  const handleImportTasks = async (importedTasks: TaskFormValues[]) => {
    for (const task of importedTasks) {
      await createTaskAsync(task, activeUserId);
    }

    await loadPage();

    return importedTasks.length;
  };

  const handleUpdateTask = async (id: string, values: TaskFormValues) => {
    try {
      await updateTask(id, values, activeUserId);
      await loadPage();
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
      await updateTaskStatus(id, status, activeUserId);
      await loadPage();
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
      await deleteTask(id, activeUserId);
      await loadPage();
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
    params.delete(TASK_QUERY_KEYS.page);

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const handleResetFilters = () => {
    handleFiltersChange(initialFilters);
  };

  const handlePageChange = (nextPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextPage <= 1) params.delete(TASK_QUERY_KEYS.page);
    else params.set(TASK_QUERY_KEYS.page, String(nextPage));
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const handleExportTasks = async () => {
    try {
      const response = await fetch("/api/tasks?export=1");
      const payload = (await response.json().catch(() => null)) as { tasks?: Task[]; message?: string } | null;
      if (!response.ok || !payload?.tasks) {
        throw new Error(payload?.message || "导出任务失败。");
      }

      const file = new Blob(
        [
          JSON.stringify(
            { version: 1, source: "U's Task", exportedAt: new Date().toISOString(), tasks: payload.tasks },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      );
      const url = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = url;
      link.download = `taskflow-tasks-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      showToast({
        title: "导出失败",
        description: error instanceof Error ? error.message : "无法导出任务，请稍后再试。",
        tone: "error",
      });
    }
  };

  const workspaceState = getWorkspaceState({
    isAuthLoading: isAuthLoading && !canUseInitialData,
    isTaskLoading: visibleIsLoading,
    taskCount: totalCount,
    userId: activeUserId,
  });

  if (workspaceState === "auth-checking") return <WorkspaceAuthCheckingNotice />;
  if (workspaceState === "guest") {
    return (
      <WorkspaceStateNotice
        title="登录后管理你的任务"
        description="登录后即可创建、筛选和更新任务，并在右侧查看完整详情。"
      />
    );
  }

  return (
    <>
      <div className="tasks-mobile-only">
        <MobileTaskListView
          tasks={filteredTasks}
          totalCount={totalCount}
          categoryCounts={categoryCounts}
          page={page}
          pageSize={pageData?.pageSize ?? DEFAULT_TASK_PAGE_SIZE}
          hasNext={pageData?.hasNext ?? false}
          filters={filters}
          isLoading={visibleIsLoading}
          onFiltersChange={handleFiltersChange}
          onPageChange={handlePageChange}
          onCreateTask={handleCreateTask}
          onUpdateStatus={handleUpdateStatus}
          onPreviewTask={setPreviewTask}
        />
      </div>
      <section className="tasks-toolbar tasks-desktop-only">
        {activeFilterLabels.length ? (
          <section className="task-url-filters card-surface" aria-label="当前筛选">
            <div className="task-url-filters__chips">
              {activeFilterLabels.map((label) => (
                <span key={label} className="task-url-filters__chip">
                  {label}
                </span>
              ))}
            </div>
            <button type="button" className="task-url-filters__clear" onClick={handleResetFilters}>
              清除筛选
            </button>
          </section>
        ) : null}
        {error ? (
          <section className="notice-card notice-card--error card-surface">
            <p>{error}</p>
          </section>
        ) : null}
        <DesktopTaskWorkbench
          tasks={filteredTasks}
          totalCount={totalCount}
          categoryCounts={categoryCounts}
          page={page}
          pageSize={pageData?.pageSize ?? DEFAULT_TASK_PAGE_SIZE}
          hasNext={pageData?.hasNext ?? false}
          filters={filters}
          isLoading={visibleIsLoading}
          onFiltersChange={handleFiltersChange}
          onResetFilters={handleResetFilters}
          onCreateTask={handleCreateTask}
          onImportTasks={handleImportTasks}
          onUpdateTask={handleUpdateTask}
          onUpdateStatus={handleUpdateStatus}
          onDeleteTask={handleDeleteTask}
          onPreviewTask={setPreviewTask}
          onExportTasks={handleExportTasks}
        />
      </section>
      <TaskQuickViewDialog
        task={previewTask}
        onClose={() => setPreviewTask(null)}
        onEdit={(task) => {
          setPreviewTask(null);
          router.push(`${pathname}/${task.id}`);
        }}
        onToggleComplete={async (task) => {
          await handleUpdateStatus(task.id, task.status === "done" ? "todo" : "done");
          setPreviewTask(null);
        }}
        onDelete={async (task) => {
          await handleDeleteTask(task.id);
          setPreviewTask(null);
        }}
      />
    </>
  );
}

function getPreferredTaskSort(): TaskFilters["sort"] {
  try {
    const saved = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    const taskSort = saved ? (JSON.parse(saved) as { taskSort?: string }).taskSort : undefined;
    if (taskSort === "优先级优先") return "priority_desc";
  } catch {
    // The default ordering is retained when local preferences cannot be read.
  }

  return "due_asc";
}

function parseTaskFilters(input: Partial<Record<keyof TaskFilters, string | null | undefined>>): TaskFilters {
  const status =
    input.status === "todo" || input.status === "in_progress" || input.status === "done" || input.status === "active"
      ? input.status
      : "all";
  const priority =
    input.priority === "low" || input.priority === "medium" || input.priority === "high" ? input.priority : "all";
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
  const parsedDate = parseTaskDateParam(input.date);
  const date = parsedDate ? formatTaskDateParam(parsedDate) : "";
  const parsedRange = parseTaskRange(input.range);
  const range = parsedRange;

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

function buildTaskPageParams(filters: TaskFilters, page: number) {
  const params = new URLSearchParams();
  const entries: Array<[string, string, string]> = [
    [TASK_QUERY_KEYS.query, filters.query, ""],
    [TASK_QUERY_KEYS.tag, filters.tag, ""],
    [TASK_QUERY_KEYS.status, filters.status, "all"],
    [TASK_QUERY_KEYS.priority, filters.priority, "all"],
    [TASK_QUERY_KEYS.due, filters.due, ""],
    [TASK_QUERY_KEYS.risk, filters.risk, ""],
    [TASK_QUERY_KEYS.date, filters.date, ""],
    [TASK_QUERY_KEYS.range, filters.range, ""],
    [TASK_QUERY_KEYS.sort, filters.sort, "due_asc"],
  ];

  entries.forEach(([key, value, fallback]) => {
    if (value && value !== fallback) params.set(key, value);
  });
  params.set(TASK_QUERY_KEYS.page, String(page));
  params.set("limit", String(DEFAULT_TASK_PAGE_SIZE));
  return params;
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

function hasActiveDateRangeFilter(date: string, range: DashboardRangeValue | "") {
  return hasActiveTaskDateRangeFilter({ date: parseTaskDateParam(date), range });
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
    labels.push(
      filters.range === DASHBOARD_RANGE_VALUES.week
        ? `本周：${formatShortDate(filters.date)}`
        : `日期：${filters.date}`,
    );
  } else if (filters.range === DASHBOARD_RANGE_VALUES.today) {
    labels.push("今天");
  } else if (filters.range === DASHBOARD_RANGE_VALUES.week) {
    labels.push("本周");
  } else if (filters.range === DASHBOARD_RANGE_VALUES.all) {
    labels.push("全部日期");
  }

  if (filters.sort !== "due_asc") {
    labels.push(sortFilterLabels[filters.sort]);
  }

  return labels;
}

const statusFilterLabels = {
  active: "未完成",
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
