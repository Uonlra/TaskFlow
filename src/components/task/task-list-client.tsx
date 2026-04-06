"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { TaskFilterBar, type TaskFilters } from "@/components/task/task-filter-bar";
import { TaskFormDialog } from "@/components/task/task-form-dialog";
import { TaskList } from "@/components/task/task-list";
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

  const handleCreateTask = async (values: TaskFormValues) => {
    try {
      if (isConfigured) {
        await createTaskAsync(values, user?.id);
      } else {
        createTask(values);
      }

      showToast({
        title: "任务已创建",
        description: `“${values.title}” 已加入当前工作台。`,
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
        description: `“${values.title}” 的修改已经保存。`,
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
        description: "这条任务已经从当前工作台中移除。",
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

  return (
    <section style={{ display: "grid", gap: 20 }}>
      {!isConfigured ? (
        <section className="card-surface" style={{ borderRadius: 24, padding: 20 }}>
          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.7 }}>
            当前还没有连接 Supabase，所以你正在编辑保存在浏览器本地的演示任务。
          </p>
        </section>
      ) : null}
      {error ? (
        <section className="card-surface" style={{ borderRadius: 24, padding: 20 }}>
          <p style={{ margin: 0, color: "var(--danger)", lineHeight: 1.7 }}>{error}</p>
        </section>
      ) : null}
      <div style={{ display: "grid", gap: 16 }}>
        <TaskFilterBar filters={filters} onChange={handleFiltersChange} />
        <TaskFormDialog onSubmitTask={handleCreateTask} />
      </div>
      {(deadlineSummary.overdue > 0 || deadlineSummary.today > 0 || deadlineSummary.upcoming > 0) && (
        <section
          className="card-surface"
          style={{
            borderRadius: 24,
            padding: 20,
            display: "grid",
            gap: 10,
            background:
              deadlineSummary.overdue > 0
                ? "linear-gradient(135deg, rgba(178,64,55,0.12), rgba(255,255,255,0.76))"
                : "rgba(255,255,255,0.76)",
          }}
        >
          <p style={{ margin: 0, color: "var(--foreground)", fontWeight: 700 }}>截止提醒</p>
          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.8 }}>
            {deadlineSummary.overdue > 0
              ? `当前有 ${deadlineSummary.overdue} 条任务已经逾期，建议优先收口。`
              : deadlineSummary.today > 0
                ? `当前有 ${deadlineSummary.today} 条任务今天到期，适合优先处理。`
                : `接下来 3 天内还有 ${deadlineSummary.upcoming} 条任务即将到期，可以提前安排节奏。`}
          </p>
        </section>
      )}
      {isConfigured && isLoading ? (
        <section className="card-surface" style={{ borderRadius: 24, padding: 20 }}>
          <p style={{ margin: 0, color: "var(--muted)" }}>正在从 Supabase 同步任务...</p>
        </section>
      ) : null}
      <TaskList
        tasks={filteredTasks}
        onUpdateTask={handleUpdateTask}
        onUpdateStatus={handleUpdateStatus}
        onDeleteTask={handleDeleteTask}
      />
    </section>
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
