"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { DesktopTaskWorkbench } from "@/features/tasks/components/desktop-task-workbench";
import type { TaskFilters } from "@/features/tasks/types/task-filters";
import { MobileTaskListView } from "@/features/tasks/components/mobile-task-list-view";
import type { TaskFormValues } from "@/features/tasks/schemas/task-schema";
import type { TaskPageInitialData } from "@/features/tasks/types/task.types";
import { hasActiveTaskDateRangeFilter, parseTaskDateParam } from "@/features/tasks/utils/task-date-filters";
import { DASHBOARD_RANGE_VALUES, TASK_QUERY_KEYS, type DashboardRangeValue } from "@/shared/lib/constants/query-params";
import { useTaskPage } from "@/features/tasks/hooks/use-task-page";
import { remoteTaskRepository } from "@/features/tasks/repositories/remote-task-repository";
import { useToast } from "@/shared/providers/toast-provider";
import { useTaskStore } from "@/features/tasks/store/task-store";
import {
  DEFAULT_TASK_FILTERS,
  DEFAULT_TASK_PAGE_SIZE,
  parseTaskFiltersFromParams,
  parseTaskPageParam,
} from "@/features/tasks/utils/task-list-query";

type TaskListClientProps = {
  initialFilters?: TaskFilters;
  initialData?: TaskPageInitialData | null;
};

export function TaskListClient({
  initialFilters: initialFiltersProp = DEFAULT_TASK_FILTERS,
  initialData = null,
}: TaskListClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const urlQuery = searchParams.toString();
  const [queryState, setQueryState] = useState(() => ({
    urlQuery,
    filters: initialFiltersProp,
    page: parseTaskPageParam(searchParams.get("page")),
  }));
  // Reconcile navigation before committing a render or starting a request for stale parameters.
  if (queryState.urlQuery !== urlQuery) {
    setQueryState({
      urlQuery,
      filters: parseTaskFiltersFromParams(searchParams),
      page: parseTaskPageParam(searchParams.get("page")),
    });
  }
  const { filters, page } = queryState;
  const createTaskAsync = useTaskStore((state) => state.createTaskAsync);
  const updateTask = useTaskStore((state) => state.updateTask);
  const updateTaskStatus = useTaskStore((state) => state.updateTaskStatus);
  const deleteTask = useTaskStore((state) => state.deleteTask);
  const localTasks = useTaskStore((state) => state.tasks);

  const {
    pageData: visiblePageData,
    isLoading: visibleIsLoading,
    error: pageError,
    userId: activeUserId,
    isGuest,
    reload: loadPage,
  } = useTaskPage({ filters, page, initialFilters: initialFiltersProp, initialData });
  const visibleTasks = visiblePageData?.tasks ?? [];
  const totalCount = visiblePageData?.total ?? 0;
  const categoryCounts = visiblePageData?.categoryCounts ?? { near: 0, active: 0, done: 0, all: 0 };
  const hasInitialLoadError = Boolean(pageError && !visiblePageData);

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
    setQueryState({ urlQuery, filters: nextFilters, page: 1 });

    const params = new URLSearchParams(searchParams.toString());

    syncParam(params, TASK_QUERY_KEYS.query, nextFilters.query, "");
    syncParam(params, TASK_QUERY_KEYS.tag, nextFilters.tag, "");
    syncParam(params, TASK_QUERY_KEYS.status, nextFilters.status, DEFAULT_TASK_FILTERS.status);
    syncParam(params, TASK_QUERY_KEYS.priority, nextFilters.priority, "all");
    syncParam(params, TASK_QUERY_KEYS.due, nextFilters.due, "");
    syncParam(params, TASK_QUERY_KEYS.risk, nextFilters.risk, "");
    syncParam(params, TASK_QUERY_KEYS.date, nextFilters.date, "");
    syncParam(params, TASK_QUERY_KEYS.range, nextFilters.range, "");
    syncParam(params, TASK_QUERY_KEYS.sort, nextFilters.sort, DEFAULT_TASK_FILTERS.sort);
    params.delete(TASK_QUERY_KEYS.page);

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const handleResetFilters = () => {
    handleFiltersChange(DEFAULT_TASK_FILTERS);
  };

  const handlePageChange = (nextPage: number) => {
    setQueryState((current) => ({ ...current, page: nextPage }));
    const params = new URLSearchParams(searchParams.toString());
    if (nextPage <= 1) params.delete(TASK_QUERY_KEYS.page);
    else params.set(TASK_QUERY_KEYS.page, String(nextPage));
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const handleExportTasks = async () => {
    try {
      let tasksToExport = localTasks;
      if (!isGuest) {
        tasksToExport = await remoteTaskRepository.exportAll();
      }

      const file = new Blob(
        [
          JSON.stringify(
            { version: 1, source: "U's Task", exportedAt: new Date().toISOString(), tasks: tasksToExport },
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

  return (
    <>
      {pageError ? (
        <TaskLoadError message={pageError} onRetry={() => void loadPage()} isInitial={hasInitialLoadError} />
      ) : null}
      {hasInitialLoadError ? null : (
        <>
          <div className="tasks-mobile-only">
            <MobileTaskListView
              tasks={visibleTasks}
              totalCount={totalCount}
              categoryCounts={categoryCounts}
              page={visiblePageData?.page ?? page}
              pageSize={visiblePageData?.pageSize ?? DEFAULT_TASK_PAGE_SIZE}
              hasNext={visiblePageData?.hasNext ?? false}
              filters={filters}
              isLoading={visibleIsLoading}
              onFiltersChange={handleFiltersChange}
              onPageChange={handlePageChange}
              onCreateTask={handleCreateTask}
              onUpdateStatus={handleUpdateStatus}
              onPreviewTask={(task) => router.push(`${pathname}/${task.id}`)}
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
            <DesktopTaskWorkbench
              tasks={visibleTasks}
              totalCount={totalCount}
              categoryCounts={categoryCounts}
              page={visiblePageData?.page ?? page}
              pageSize={visiblePageData?.pageSize ?? DEFAULT_TASK_PAGE_SIZE}
              hasNext={visiblePageData?.hasNext ?? false}
              filters={filters}
              isLoading={visibleIsLoading}
              onFiltersChange={handleFiltersChange}
              onResetFilters={handleResetFilters}
              onPageChange={handlePageChange}
              onCreateTask={handleCreateTask}
              onImportTasks={handleImportTasks}
              onUpdateTask={handleUpdateTask}
              onUpdateStatus={handleUpdateStatus}
              onDeleteTask={handleDeleteTask}
              onPreviewTask={(task) => router.push(`${pathname}/${task.id}`)}
              onExportTasks={handleExportTasks}
            />
          </section>
        </>
      )}
    </>
  );
}

function TaskLoadError({ message, onRetry, isInitial }: { message: string; onRetry: () => void; isInitial: boolean }) {
  return (
    <section
      className={`notice-card notice-card--error task-load-error card-surface${isInitial ? " task-load-error--initial" : ""}`}
      role="alert"
    >
      <div>
        <strong>任务加载失败</strong>
        <p>{message}</p>
      </div>
      <button type="button" className="tesla-action tesla-action--secondary" onClick={onRetry}>
        重新加载
      </button>
    </section>
  );
}

function syncParam(params: URLSearchParams, key: string, value: string, fallbackValue: string) {
  if (!value || value === fallbackValue) {
    params.delete(key);
    return;
  }

  params.set(key, value);
}

function hasActiveDateRangeFilter(date: string, range: DashboardRangeValue | "") {
  return hasActiveTaskDateRangeFilter({ date: parseTaskDateParam(date), range });
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

  if (filters.status !== DEFAULT_TASK_FILTERS.status) {
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

  if (filters.sort !== DEFAULT_TASK_FILTERS.sort) {
    labels.push(sortFilterLabels[filters.sort]);
  }

  return labels;
}

const statusFilterLabels = {
  all: "全部状态",
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
  created_asc: "创建顺序",
  created_desc: "最新创建",
  updated_desc: "最近更新",
  priority_desc: "优先级排序",
  due_asc: "截止时间",
} as const;
