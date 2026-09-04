"use client";

import type { CSSProperties } from "react";
import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";

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

export function DashboardRangeMenu({ range, options, onChange, filters, onFiltersChange }: DashboardRangeMenuProps) {
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);
  const filterMenuRef = useRef<HTMLDivElement | null>(null);
  const filterMenuId = useId();
  const [isMounted, setIsMounted] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterMenuStyle, setFilterMenuStyle] = useState<CSSProperties | null>(null);
  const hasActiveFilters = filters.status !== "all" || filters.priority !== "all" || filters.due !== "";
  const activeFilterCount =
    Number(filters.status !== "all") + Number(filters.priority !== "all") + Number(Boolean(filters.due));

  useEffect(() => {
    setIsMounted(true);

    return () => setIsMounted(false);
  }, []);

  useEffect(() => {
    if (!isFilterOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      if (
        !filterButtonRef.current?.contains(target) &&
        !filterMenuRef.current?.contains(target) &&
        !target.closest(".custom-select__menu")
      ) {
        setIsFilterOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsFilterOpen(false);
        filterButtonRef.current?.focus();
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFilterOpen]);

  useEffect(() => {
    if (!isFilterOpen || !filterButtonRef.current) {
      setFilterMenuStyle(null);
      return;
    }

    const updateFilterMenuPosition = () => {
      const rect = filterButtonRef.current?.getBoundingClientRect();

      if (!rect) {
        return;
      }

      const inset = 12;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const menuWidth = Math.min(240, viewportWidth - inset * 2);
      const spaceBelow = viewportHeight - rect.bottom - inset;
      const spaceAbove = rect.top - inset;
      const openUpward = spaceBelow < 292 && spaceAbove > spaceBelow;
      const availableHeight = openUpward ? spaceAbove : spaceBelow;

      setFilterMenuStyle({
        position: "fixed",
        left: Math.min(Math.max(inset, rect.right - menuWidth), viewportWidth - menuWidth - inset),
        width: menuWidth,
        zIndex: 3000,
        maxHeight: Math.max(160, availableHeight),
        ...(openUpward ? { bottom: viewportHeight - rect.top + 8 } : { top: rect.bottom + 8 }),
      });
    };

    updateFilterMenuPosition();
    window.addEventListener("resize", updateFilterMenuPosition);
    window.addEventListener("scroll", updateFilterMenuPosition, true);

    return () => {
      window.removeEventListener("resize", updateFilterMenuPosition);
      window.removeEventListener("scroll", updateFilterMenuPosition, true);
    };
  }, [isFilterOpen]);

  return (
    <div className="dashboard-range-menu" aria-label="总览任务范围工具栏">
      <div className="dashboard-range-menu__scope">
        <CustomSelect ariaLabel="任务范围" value={range} options={options} onChange={onChange} />
      </div>
      <span className="dashboard-range-menu__divider" aria-hidden="true" />
      <div className="dashboard-range-menu__filter">
        <button
          ref={filterButtonRef}
          type="button"
          className={`dashboard-range-menu__tool dashboard-range-menu__tool--filter${hasActiveFilters ? " is-active" : ""}`}
          aria-label={hasActiveFilters ? "筛选优先处理任务（已启用）" : "筛选优先处理任务"}
          aria-expanded={isFilterOpen}
          aria-controls={filterMenuId}
          title={hasActiveFilters ? "筛选优先处理任务（已启用）" : "筛选优先处理任务"}
          onClick={() => setIsFilterOpen((current) => !current)}
        >
          <span aria-hidden="true" />
          {hasActiveFilters ? <b aria-hidden="true">{activeFilterCount}</b> : null}
        </button>
        {isFilterOpen && isMounted && filterMenuStyle
          ? createPortal(
              <div
                ref={filterMenuRef}
                id={filterMenuId}
                role="dialog"
                aria-label="筛选优先处理任务"
                className="dashboard-range-menu__filter-menu"
                style={filterMenuStyle}
              >
                <div className="dashboard-range-menu__filter-head">
                  <span>筛选任务</span>
                  <div>
                    {hasActiveFilters ? (
                      <button type="button" onClick={() => onFiltersChange(initialFilters)}>
                        清除
                      </button>
                    ) : null}
                    <button type="button" onClick={() => setIsFilterOpen(false)}>
                      完成
                    </button>
                  </div>
                </div>
                <label>
                  <span>状态</span>
                  <CustomSelect
                    ariaLabel="优先处理任务状态"
                    value={filters.status}
                    options={statusOptions}
                    onChange={(status) => onFiltersChange({ ...filters, status })}
                  />
                </label>
                <label>
                  <span>优先级</span>
                  <CustomSelect
                    ariaLabel="优先处理任务优先级"
                    value={filters.priority}
                    options={priorityOptions}
                    onChange={(priority) => onFiltersChange({ ...filters, priority })}
                  />
                </label>
                <label>
                  <span>截止日期</span>
                  <CustomSelect
                    ariaLabel="优先处理任务截止日期"
                    value={filters.due}
                    options={dueOptions}
                    onChange={(due) => onFiltersChange({ ...filters, due })}
                  />
                </label>
              </div>,
              document.body,
            )
          : null}
      </div>
      <details className="dashboard-range-menu__more">
        <summary aria-label="更多总览操作" title="更多操作">
          <span aria-hidden="true" />
        </summary>
        <div className="dashboard-range-menu__more-menu">
          <Link href="/tasks">查看任务列表</Link>
        </div>
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
