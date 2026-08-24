"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";

import { CustomSelect } from "@/shared/components/common/custom-select";
import { DataEmptyState } from "@/shared/components/common/data-empty-state";
import { DesktopTaskTable } from "@/features/tasks/components/desktop-task-table";
import { TaskDetailPanel } from "@/features/tasks/components/task-detail-panel";
import type { TaskFilters } from "@/features/tasks/types/task-filters";
import { TaskFormDialog } from "@/features/tasks/components/task-form-dialog";
import type { TaskFormValues } from "@/features/tasks/schemas/task-schema";
import type { Task } from "@/features/tasks/types/task.types";
import { getTaskDueMeta } from "@/features/tasks/utils/task-deadline";
import { createTaskExportPayload, parseTaskImportPayload } from "@/features/tasks/utils/task-transfer";
import { useToast } from "@/shared/providers/toast-provider";
import type { TaskCategoryCounts } from "@/features/tasks/utils/task-list-query";

type DesktopTaskWorkbenchProps = {
  tasks: Task[];
  totalCount?: number;
  categoryCounts?: TaskCategoryCounts;
  page?: number;
  pageSize?: number;
  hasNext?: boolean;
  onPageChange?: (page: number) => void;
  onExportTasks?: () => void | Promise<void>;
  totalTasks?: Task[];
  filters: TaskFilters;
  isLoading: boolean;
  onFiltersChange: (filters: TaskFilters) => void;
  onResetFilters: () => void;
  onCreateTask: (values: TaskFormValues) => void | Promise<void>;
  onImportTasks: (tasks: TaskFormValues[]) => Promise<number>;
  onUpdateTask: (id: string, values: TaskFormValues) => void | Promise<void>;
  onUpdateStatus: (id: string, status: Task["status"]) => void | Promise<void>;
  onDeleteTask: (id: string) => void | Promise<void>;
  onPreviewTask?: (task: Task) => void;
};

const categoryTabs = [
  { value: "near", label: "近期" },
  { value: "active", label: "未完成" },
  { value: "done", label: "已完成" },
  { value: "all", label: "全部" },
] as const;

type CategoryTab = (typeof categoryTabs)[number]["value"];
type EmptyStateCopy = {
  title: string;
  description: string;
};

export function DesktopTaskWorkbench({
  tasks,
  totalCount,
  categoryCounts,
  page = 1,
  pageSize = 50,
  hasNext = false,
  onPageChange,
  onExportTasks,
  totalTasks = tasks,
  filters,
  isLoading,
  onFiltersChange,
  onResetFilters,
  onCreateTask,
  onImportTasks,
  onUpdateTask,
  onUpdateStatus,
  onDeleteTask,
  onPreviewTask = () => {},
}: DesktopTaskWorkbenchProps) {
  const { showToast } = useToast();
  const importInputRef = useRef<HTMLInputElement>(null);
  const taskListScrollTopRef = useRef(0);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) ?? tasks[0] ?? null,
    [selectedTaskId, tasks],
  );
  const category = getActiveCategory(filters);
  const resolvedTotalCount = totalCount ?? totalTasks.length;
  const computedCounts = useMemo(() => buildCategoryCounts(totalTasks), [totalTasks]);
  const counts = categoryCounts ?? computedCounts;
  const hasActiveFilters = hasWorkbenchFilters(filters);
  const emptyState = getEmptyStateCopy({
    category,
    filters,
    hasActiveFilters,
    totalCount: resolvedTotalCount,
  });

  useEffect(() => {
    if (!tasks.length) {
      setSelectedTaskId(null);
      return;
    }

    if (!selectedTaskId || !tasks.some((task) => task.id === selectedTaskId)) {
      setSelectedTaskId(tasks[0].id);
    }
  }, [selectedTaskId, tasks]);

  const handleCategoryChange = (value: CategoryTab) => {
    const nextFilters: TaskFilters = {
      ...filters,
      due: "",
      status: "all",
      risk: "",
      date: "",
      range: "",
      sort: value === "done" ? "updated_desc" : "due_asc",
    };

    if (value === "near") {
      nextFilters.due = "near";
    }

    if (value === "active") {
      nextFilters.status = "active";
    }

    if (value === "done") {
      nextFilters.status = "done";
    }

    onFiltersChange(nextFilters);
  };

  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, query: value });
  };

  const handleExportTasks = async () => {
    if (onExportTasks) {
      await onExportTasks();
      return;
    }

    const payload = createTaskExportPayload(totalTasks);
    const file = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = `taskflow-tasks-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    showToast({
      title: "任务已导出",
      description: `已导出 ${totalTasks.length} 项任务。`,
      tone: "success",
    });
  };

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setIsImporting(true);
    try {
      const payload = JSON.parse(await file.text()) as unknown;
      const importedTasks = parseTaskImportPayload(payload);
      const importedCount = await onImportTasks(importedTasks);

      showToast({
        title: "任务已导入",
        description: `已追加 ${importedCount} 项任务。`,
        tone: "success",
      });
    } catch (error) {
      showToast({
        title: "导入失败",
        description: error instanceof Error ? error.message : "无法读取任务文件，请稍后再试。",
        tone: "error",
      });
    } finally {
      setIsImporting(false);
    }
  };

  if (isLoading && !resolvedTotalCount) {
    return (
      <section className="desktop-task-workbench desktop-task-workbench--empty" aria-label="任务同步状态">
        <div className="desktop-task-workbench__main">
          <header className="desktop-task-workbench__topbar">
            <div>
              <h1>任务</h1>
              <p>正在同步账号数据</p>
            </div>
          </header>
          <DataEmptyState title="正在同步任务" description="数据准备完成后会自动显示任务列表。" />
        </div>
      </section>
    );
  }

  if (!resolvedTotalCount) {
    return (
      <section className="desktop-task-workbench desktop-task-workbench--empty" aria-label="任务空状态">
        <div className="desktop-task-workbench__main">
          <header className="desktop-task-workbench__topbar">
            <div>
              <h1>任务</h1>
              <p>开始整理当前事项</p>
            </div>
            <div className="desktop-task-workbench__data-actions">
              <input
                ref={importInputRef}
                className="desktop-task-import-input"
                type="file"
                accept="application/json,.json"
                tabIndex={-1}
                aria-hidden="true"
                onChange={handleImportFile}
              />
              <button type="button" onClick={() => importInputRef.current?.click()} disabled={isImporting}>
                {isImporting ? "正在导入" : "导入任务"}
              </button>
              <TaskFormDialog onSubmitTask={onCreateTask} triggerLabel="新建任务" />
            </div>
          </header>
          <DataEmptyState title="还没有任务" description="新建第一条任务，开始整理当前事项。" />
        </div>
      </section>
    );
  }

  return (
    <section
      className={
        tasks.length ? "desktop-task-workbench" : "desktop-task-workbench desktop-task-workbench--filtered-empty"
      }
      aria-label="桌面端任务工作台"
    >
      <div className="desktop-task-workbench__main">
        <header className="desktop-task-workbench__topbar">
          <div>
            <h1>任务</h1>
            <p>{isLoading ? "同步中" : `共 ${resolvedTotalCount} 项任务`}</p>
          </div>
          <label className="desktop-task-search">
            <span aria-hidden="true" />
            <input
              value={filters.query}
              onChange={(event) => handleSearchChange(event.target.value)}
              placeholder="搜索任务、标签"
              aria-label="搜索任务、标签"
            />
          </label>
        </header>

        <div className="desktop-task-toolbar" aria-label="任务筛选工具栏">
          <div className="desktop-task-tabs" aria-label="任务分类">
            {categoryTabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                aria-pressed={category === tab.value}
                className={category === tab.value ? "desktop-task-tabs__button is-active" : "desktop-task-tabs__button"}
                onClick={() => handleCategoryChange(tab.value)}
              >
                <span>{tab.label}</span>
                <strong>{counts[tab.value]}</strong>
              </button>
            ))}
          </div>

          <div className="desktop-task-toolbar__controls">
            <CustomSelect
              ariaLabel="任务状态筛选"
              value={filters.status}
              options={statusOptions}
              onChange={(value) => onFiltersChange({ ...filters, status: value })}
            />
            <CustomSelect
              ariaLabel="任务优先级筛选"
              value={filters.priority}
              options={priorityOptions}
              onChange={(value) => onFiltersChange({ ...filters, priority: value })}
            />
            <CustomSelect
              ariaLabel="任务排序"
              value={filters.sort}
              options={sortOptions}
              onChange={(value) => onFiltersChange({ ...filters, sort: value })}
            />
            <TaskFormDialog onSubmitTask={onCreateTask} triggerLabel="新建任务" />
          </div>
        </div>

        {tasks.length ? (
          <DesktopTaskTable
            tasks={tasks}
            emptyState={emptyState}
            selectedTaskId={selectedTask?.id ?? null}
            onSelectTask={setSelectedTaskId}
            onPreviewTask={onPreviewTask}
            onUpdateStatus={onUpdateStatus}
            scrollPositionRef={taskListScrollTopRef}
          />
        ) : (
          <DataEmptyState
            variant="table"
            title={emptyState.title}
            description={emptyState.description}
            action={
              <button type="button" onClick={onResetFilters}>
                清除筛选
              </button>
            }
          />
        )}

        {tasks.length ? (
          <footer className="desktop-task-workbench__footer">
            <input
              ref={importInputRef}
              className="desktop-task-import-input"
              type="file"
              accept="application/json,.json"
              tabIndex={-1}
              aria-hidden="true"
              onChange={handleImportFile}
            />
            <div className="desktop-task-workbench__data-actions">
              <button type="button" onClick={() => importInputRef.current?.click()} disabled={isImporting}>
                {isImporting ? "正在导入" : "导入任务"}
              </button>
              <button type="button" onClick={handleExportTasks} disabled={isImporting}>
                导出任务
              </button>
            </div>
            {onPageChange && resolvedTotalCount > pageSize ? (
              <TaskPagination
                page={page}
                pageSize={pageSize}
                total={resolvedTotalCount}
                hasNext={hasNext}
                onPageChange={onPageChange}
              />
            ) : null}
          </footer>
        ) : null}
      </div>

      {tasks.length ? (
        <TaskDetailPanel
          task={selectedTask}
          onUpdateTask={onUpdateTask}
          onUpdateStatus={onUpdateStatus}
          onDeleteTask={onDeleteTask}
        />
      ) : null}
    </section>
  );
}

function hasWorkbenchFilters(filters: TaskFilters) {
  return (
    filters.query.trim() !== "" ||
    filters.tag.trim() !== "" ||
    filters.status !== "all" ||
    filters.priority !== "all" ||
    filters.due !== "" ||
    filters.risk !== "" ||
    filters.date !== "" ||
    filters.range !== "" ||
    filters.sort !== "due_asc"
  );
}

function getEmptyStateCopy({
  category,
  filters,
  hasActiveFilters,
  totalCount,
}: {
  category: CategoryTab;
  filters: TaskFilters;
  hasActiveFilters: boolean;
  totalCount: number;
}): EmptyStateCopy {
  if (!totalCount) {
    return {
      title: "暂无任务",
      description: "新建一条任务后，这里会显示任务列表。",
    };
  }

  if (filters.query.trim()) {
    return {
      title: "没有匹配结果",
      description: "换个关键词，或清空筛选再试。",
    };
  }

  if (category === "near") {
    return {
      title: "临近任务为空",
      description: "当前没有今天或三天内到期的未完成任务。",
    };
  }

  if (category === "active") {
    return {
      title: "没有未完成任务",
      description: "当前筛选下的任务都已经完成。",
    };
  }

  if (category === "done") {
    return {
      title: "没有已完成任务",
      description: "完成任务后会汇总到这里。",
    };
  }

  if (hasActiveFilters) {
    return {
      title: "没有匹配结果",
      description: "调整状态、优先级或日期条件再试。",
    };
  }

  return {
    title: "没有任务",
    description: "新建一条任务后，这里会显示任务列表。",
  };
}

function getActiveCategory(filters: TaskFilters): CategoryTab {
  if (filters.status === "done") {
    return "done";
  }

  if (filters.status === "active") {
    return "active";
  }

  if (filters.due === "near" || filters.due === "today" || filters.due === "upcoming") {
    return "near";
  }

  return "all";
}

function buildCategoryCounts(tasks: Task[]) {
  return tasks.reduce(
    (counts, task) => {
      const dueMeta = getTaskDueMeta(task);

      counts.all += 1;

      if (task.status === "done") {
        counts.done += 1;
      } else {
        counts.active += 1;
      }

      if (task.status !== "done" && (dueMeta.isDueToday || dueMeta.isUpcoming)) {
        counts.near += 1;
      }

      return counts;
    },
    { near: 0, active: 0, all: 0, done: 0 },
  );
}

function TaskPagination({
  page,
  pageSize,
  total,
  hasNext,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  hasNext: boolean;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <nav className="task-pagination" aria-label="任务分页">
      <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        上一页
      </button>
      <span>
        第 {page} / {totalPages} 页
      </span>
      <button type="button" disabled={!hasNext} onClick={() => onPageChange(page + 1)}>
        下一页
      </button>
    </nav>
  );
}

const statusOptions = [
  { value: "all" as const, label: "状态", description: "全部状态" },
  { value: "active" as const, label: "未完成", description: "待办与进行中" },
  { value: "todo" as const, label: "待开始", description: "还没动手" },
  { value: "in_progress" as const, label: "进行中", description: "正在推进" },
  { value: "done" as const, label: "已完成", description: "已经完成" },
];

const priorityOptions = [
  { value: "all" as const, label: "优先级", description: "全部优先级" },
  { value: "high" as const, label: "高", description: "高优先级" },
  { value: "medium" as const, label: "中", description: "中优先级" },
  { value: "low" as const, label: "低", description: "低优先级" },
];

const sortOptions = [
  { value: "due_asc" as const, label: "截止时间", description: "快到期在前" },
  { value: "priority_desc" as const, label: "优先级", description: "重要任务在前" },
  { value: "updated_desc" as const, label: "最近更新", description: "最近更新在前" },
  { value: "created_desc" as const, label: "创建时间", description: "新建任务在前" },
];
