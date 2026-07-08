"use client";

import { useEffect, useMemo, useState } from "react";

import { CustomSelect } from "@/components/common/custom-select";
import { DesktopTaskTable } from "@/components/task/desktop-task-table";
import { TaskDetailPanel } from "@/components/task/task-detail-panel";
import type { TaskFilters } from "@/components/task/task-filter-bar";
import { TaskFormDialog } from "@/components/task/task-form-dialog";
import type { TaskFormValues } from "@/features/tasks/schemas/task-schema";
import type { Task } from "@/features/tasks/types/task.types";
import { getTaskDueMeta } from "@/features/tasks/utils/task-deadline";

type DesktopTaskWorkbenchProps = {
  tasks: Task[];
  totalTasks: Task[];
  filters: TaskFilters;
  isLoading: boolean;
  onFiltersChange: (filters: TaskFilters) => void;
  onResetFilters: () => void;
  onCreateTask: (values: TaskFormValues) => void | Promise<void>;
  onUpdateTask: (id: string, values: TaskFormValues) => void | Promise<void>;
  onUpdateStatus: (id: string, status: Task["status"]) => void | Promise<void>;
  onDeleteTask: (id: string) => void | Promise<void>;
};

const categoryTabs = [
  { value: "near", label: "临近" },
  { value: "overdue", label: "逾期" },
  { value: "all", label: "全部" },
  { value: "done", label: "已完成" },
] as const;

type CategoryTab = (typeof categoryTabs)[number]["value"];

export function DesktopTaskWorkbench({
  tasks,
  totalTasks,
  filters,
  isLoading,
  onFiltersChange,
  onResetFilters,
  onCreateTask,
  onUpdateTask,
  onUpdateStatus,
  onDeleteTask,
}: DesktopTaskWorkbenchProps) {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) ?? tasks[0] ?? null,
    [selectedTaskId, tasks],
  );
  const category = getActiveCategory(filters);
  const counts = useMemo(() => buildCategoryCounts(totalTasks), [totalTasks]);

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

    if (value === "overdue") {
      nextFilters.due = "overdue";
    }

    if (value === "done") {
      nextFilters.status = "done";
    }

    onFiltersChange(nextFilters);
  };

  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, query: value });
  };

  return (
    <section className="desktop-task-workbench" aria-label="桌面端任务工作台">
      <div className="desktop-task-workbench__main">
        <header className="desktop-task-workbench__topbar">
          <div>
            <h1>任务</h1>
            <p>{isLoading ? "同步中" : `共 ${totalTasks.length} 项任务`}</p>
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
                className={
                  category === tab.value
                    ? "desktop-task-tabs__button is-active"
                    : "desktop-task-tabs__button"
                }
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

        <DesktopTaskTable
          tasks={tasks}
          selectedTaskId={selectedTask?.id ?? null}
          onSelectTask={setSelectedTaskId}
          onUpdateStatus={onUpdateStatus}
        />

        <footer className="desktop-task-workbench__footer">
          <span>共 {tasks.length} 项任务</span>
          <button type="button" onClick={onResetFilters}>
            重置筛选
          </button>
        </footer>
      </div>

      <TaskDetailPanel
        task={selectedTask}
        onUpdateTask={onUpdateTask}
        onUpdateStatus={onUpdateStatus}
        onDeleteTask={onDeleteTask}
      />
    </section>
  );
}

function getActiveCategory(filters: TaskFilters): CategoryTab {
  if (filters.status === "done") {
    return "done";
  }

  if (filters.due === "overdue") {
    return "overdue";
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
      }

      if (task.status !== "done" && (dueMeta.isDueToday || dueMeta.isUpcoming)) {
        counts.near += 1;
      }

      if (task.status !== "done" && dueMeta.isOverdue) {
        counts.overdue += 1;
      }

      return counts;
    },
    { near: 0, overdue: 0, all: 0, done: 0 },
  );
}

const statusOptions = [
  { value: "all" as const, label: "状态", description: "全部状态" },
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
