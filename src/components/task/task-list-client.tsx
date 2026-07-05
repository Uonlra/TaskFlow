"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { AnimatedSection } from "@/components/common/animated-section";
import { ScrambleText } from "@/components/common/scramble-text";
import { TaskFilterBar, type TaskFilters } from "@/components/task/task-filter-bar";
import { TaskFormDialog } from "@/components/task/task-form-dialog";
import { MobileTaskListView } from "@/components/task/mobile-task-list-view";
import { TaskList } from "@/components/task/task-list";
import { TaskSignalPanel } from "@/components/task/task-signal-panel";
import type { TaskFormValues } from "@/features/tasks/schemas/task-schema";
import { getTaskDueMeta, sortTasks } from "@/features/tasks/utils/task-deadline";
import { useAuth } from "@/providers/auth-provider";
import { useToast } from "@/providers/toast-provider";
import { useTaskStore } from "@/store/task-store";

const initialFilters: TaskFilters = {
  query: "",
  tag: "",
  status: "all",
  priority: "all",
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

      return matchQuery && matchTag && matchStatus && matchPriority;
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
    filters.sort !== "due_asc";

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

    syncParam(params, "query", nextFilters.query, "");
    syncParam(params, "tag", nextFilters.tag, "");
    syncParam(params, "status", nextFilters.status, "all");
    syncParam(params, "priority", nextFilters.priority, "all");
    syncParam(params, "sort", nextFilters.sort, "due_asc");

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
  const motionKey = `${filters.query}|${filters.tag}|${filters.status}|${filters.priority}|${filters.sort}|${filteredTasks.map((task) => `${task.id}:${task.status}`).join(",")}`;

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
      {!isConfigured ? (
        <section className="notice-card card-surface">
          <p>
            还没连 Appwrite，所以任务先存在浏览器本地，够用，但别太飘。
          </p>
        </section>
      ) : null}
      {error ? (
        <section className="notice-card notice-card--error card-surface">
          <p>{error}</p>
        </section>
      ) : null}
      <AnimatedSection className="tasks-highlight-grid">
        <TaskSignalPanel
          tasks={filteredTasks}
          eyebrow="任务列表"
          title={signalTitle}
          description={signalDescription}
          activeLabel={hasActiveFilters ? "筛选后先看" : "队列优先处理"}
          variant="tasks"
        />

        <aside className="tasks-create-card card-surface">
          <div>
            <p className="section-eyebrow panel-eyebrow">
              新建任务
            </p>
            <p className="panel-description panel-description--compact">
              想到什么先记下来。标题写清楚一点，之后回看会少猜很多。
            </p>
          </div>
          <TaskFormDialog onSubmitTask={handleCreateTask} />
        </aside>
      </AnimatedSection>

      <AnimatedSection as="div" className="tasks-filter-area" delayMs={80}>
        <TaskFilterBar
          filters={filters}
          resultCount={filteredTasks.length}
          totalCount={tasks.length}
          onChange={handleFiltersChange}
          onReset={handleResetFilters}
        />
      </AnimatedSection>
      <AnimatedSection className="tasks-view-summary card-surface" delayMs={120}>
        <div className="tasks-view-summary__copy">
          <p className="section-eyebrow panel-eyebrow">
            当前任务视图
          </p>
          <p>
            <ScrambleText text={summaryLabel} playKey={motionKey} durationMs={420} />
          </p>
        </div>
        {hasActiveFilters ? (
          <button
            type="button"
            onClick={handleResetFilters}
            className="tesla-action tesla-action--secondary"
          >
            回到全部任务
          </button>
        ) : null}
      </AnimatedSection>
      {(deadlineSummary.overdue > 0 || deadlineSummary.today > 0 || deadlineSummary.upcoming > 0) && (
        <AnimatedSection
          className={deadlineSummary.overdue > 0 ? "tasks-deadline-card tasks-deadline-card--danger card-surface" : "tasks-deadline-card card-surface"}
          delayMs={140}
        >
          <p className={deadlineSummary.overdue > 0 ? "section-eyebrow panel-eyebrow panel-eyebrow--danger" : "section-eyebrow panel-eyebrow"}>
            截止提醒
          </p>
          <p>
            {deadlineSummary.overdue > 0
              ? `有 ${deadlineSummary.overdue} 条已经逾期，先处理它们比较安心。`
              : deadlineSummary.today > 0
                ? `有 ${deadlineSummary.today} 条今天到期，最好别拖到最后一分钟。`
                : `接下来 3 天有 ${deadlineSummary.upcoming} 条快到了，提前看一眼就好。`}
          </p>
        </AnimatedSection>
      )}
      {isConfigured && isLoading ? (
        <section className="notice-card card-surface">
          <p>正在从 Appwrite 同步任务，稍等一下...</p>
        </section>
      ) : null}
      <TaskList
        tasks={filteredTasks}
        motionKey={motionKey}
        emptyAction={<TaskFormDialog onSubmitTask={handleCreateTask} triggerLabel="新增一条任务" />}
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
  const sort =
    input.sort === "created_desc" ||
    input.sort === "updated_desc" ||
    input.sort === "priority_desc" ||
    input.sort === "due_asc"
      ? input.sort
      : "due_asc";

  return {
    query: input.query ?? "",
    tag: input.tag ?? "",
    status,
    priority,
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
    left.sort === right.sort
  );
}
