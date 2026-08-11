"use client";

import Link from "next/link";

import { CustomSelect, type CustomSelectOption } from "@/shared/components/common/custom-select";
import type { TaskPriority, TaskStatus } from "@/features/tasks/types/task.types";
import type { DashboardAnalyticsRange } from "@/features/tasks/utils/task-analytics";
import type { TaskDueFilter } from "@/shared/lib/constants/query-params";

export type DashboardRangeOption = { value: DashboardAnalyticsRange; label: string };

type DashboardRangeMenuProps = {
  range: DashboardAnalyticsRange;
  options: DashboardRangeOption[];
  onChange: (range: DashboardAnalyticsRange) => void;
  filters: DashboardPriorityFilters;
  onFiltersChange: (filters: DashboardPriorityFilters) => void;
};

export type DashboardPriorityFilters = {
  status: TaskStatus | "all";
  priority: TaskPriority | "all";
  due: TaskDueFilter | "";
};

export function DashboardRangeMenu({
  range,
  options,
  onChange,
  filters,
  onFiltersChange,
}: DashboardRangeMenuProps) {
  const hasActiveFilters = filters.status !== "all" || filters.priority !== "all" || filters.due !== "";

  return (
    <div className="dashboard-range-menu" aria-label="总览任务范围工具栏">
      <label className="sr-only" htmlFor="dashboard-range-select">任务范围</label>
      <div className="dashboard-range-menu__select-wrap">
        <select
          id="dashboard-range-select"
          value={range}
          onChange={(event) => onChange(event.target.value as DashboardAnalyticsRange)}
          className="dashboard-range-menu__select"
        >
          {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <span className="dashboard-range-menu__chevron" aria-hidden="true" />
      </div>
      <details className="dashboard-range-menu__filter">
        <summary className="dashboard-range-menu__tool dashboard-range-menu__tool--filter" aria-label="筛选优先处理任务" title="筛选优先处理任务"><span aria-hidden="true" /></summary>
        <div className="dashboard-range-menu__filter-menu">
          <div className="dashboard-range-menu__filter-head">
            <span>筛选任务</span>
            {hasActiveFilters ? <button type="button" onClick={() => onFiltersChange(initialFilters)}>清除</button> : null}
          </div>
          <label>
            <span>状态</span>
            <CustomSelect ariaLabel="优先处理任务状态" value={filters.status} options={statusOptions} onChange={(status) => onFiltersChange({ ...filters, status })} />
          </label>
          <label>
            <span>优先级</span>
            <CustomSelect ariaLabel="优先处理任务优先级" value={filters.priority} options={priorityOptions} onChange={(priority) => onFiltersChange({ ...filters, priority })} />
          </label>
          <label>
            <span>截止日期</span>
            <CustomSelect ariaLabel="优先处理任务截止日期" value={filters.due} options={dueOptions} onChange={(due) => onFiltersChange({ ...filters, due })} />
          </label>
        </div>
      </details>
      <details className="dashboard-range-menu__more">
        <summary aria-label="更多总览操作" title="更多操作"><span aria-hidden="true" /></summary>
        <div className="dashboard-range-menu__more-menu"><Link href="/tasks">查看任务列表</Link></div>
      </details>
    </div>
  );
}

const initialFilters: DashboardPriorityFilters = { status: "all", priority: "all", due: "" };

const statusOptions: Array<CustomSelectOption<TaskStatus | "all">> = [
  { value: "all", label: "全部状态" },
  { value: "todo", label: "待开始" },
  { value: "in_progress", label: "进行中" },
  { value: "done", label: "已完成" },
];

const priorityOptions: Array<CustomSelectOption<TaskPriority | "all">> = [
  { value: "all", label: "全部优先级" },
  { value: "high", label: "高优先级" },
  { value: "medium", label: "中优先级" },
  { value: "low", label: "低优先级" },
];

const dueOptions: Array<CustomSelectOption<TaskDueFilter | "">> = [
  { value: "", label: "全部截止日期" },
  { value: "near", label: "临近截止" },
  { value: "today", label: "今天到期" },
  { value: "upcoming", label: "即将到期" },
  { value: "overdue", label: "已逾期" },
];
