"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { AnimatedSection } from "@/components/common/animated-section";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { CompletionTrendChart } from "@/components/dashboard/completion-trend-chart";
import { ProgressOverview } from "@/components/dashboard/progress-overview";
import { StatsGrid } from "@/components/dashboard/stats-grid";
import { StatusDistributionChart } from "@/components/dashboard/status-distribution-chart";
import { TagSummary } from "@/components/dashboard/tag-summary";
import { TagDistributionChart } from "@/components/dashboard/tag-distribution-chart";
import { UpcomingDeadlines } from "@/components/dashboard/upcoming-deadlines";
import { TaskList } from "@/components/task/task-list";
import { TaskSignalPanel } from "@/components/task/task-signal-panel";
import type { Task } from "@/features/tasks/types/task.types";
import { getTaskDueMeta } from "@/features/tasks/utils/task-deadline";
import { useAuth } from "@/providers/auth-provider";
import { useTaskStore } from "@/store/task-store";

type DashboardRange = "today" | "week" | "all";

const rangeOptions: Array<{ value: DashboardRange; label: string }> = [
  { value: "today", label: "今天" },
  { value: "week", label: "本周" },
  { value: "all", label: "全部" },
];

type DashboardClientProps = {
  initialRange?: DashboardRange;
};

export function DashboardClient({ initialRange = "today" }: DashboardClientProps) {
  const { user, isConfigured } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [range, setRange] = useState<DashboardRange>(initialRange);
  const tasks = useTaskStore((state) => state.tasks);
  const isLoading = useTaskStore((state) => state.isLoading);
  const error = useTaskStore((state) => state.error);
  const syncTasks = useTaskStore((state) => state.syncTasks);

  useEffect(() => {
    if (isConfigured && user?.id) {
      void syncTasks(user.id);
    }
  }, [isConfigured, syncTasks, user?.id]);

  useEffect(() => {
    const nextRange = parseDashboardRange(searchParams.get("range"));

    setRange((current) => (current === nextRange ? current : nextRange));
  }, [searchParams]);

  const scopedTasks = useMemo(() => filterTasksByRange(tasks, range), [range, tasks]);
  const activeScopedTasks = useMemo(() => scopedTasks.filter((task) => task.status !== "done"), [scopedTasks]);
  const rangeLabel = rangeOptions.find((item) => item.value === range)?.label ?? "今天";
  const prioritiesTitle = range === "all" ? "所有重点任务" : `${rangeLabel}先看的任务`;
  const dueSummary = useMemo(() => {
    return activeScopedTasks.reduce(
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
  }, [activeScopedTasks]);

  const stats = useMemo(() => {
    const open = scopedTasks.filter((task) => task.status !== "done").length;
    const inProgress = scopedTasks.filter((task) => task.status === "in_progress").length;
    const completed = scopedTasks.filter((task) => task.status === "done").length;
    const completionLabel = range === "today" ? "今日完成" : range === "week" ? "本周完成" : "累计完成";

    return [
      {
        label: "未完成任务",
        value: String(open),
        helper:
          range === "all"
            ? isConfigured
              ? "Appwrite 里的任务已经同步到这里。"
              : "现在展示的是演示数据，适合先看看手感。"
            : `${rangeLabel}还剩这些，先放在眼前。`,
        accent: "var(--primary)",
      },
      {
        label: "进行中",
        value: String(inProgress),
        helper: "同时推进的事情少一点，心里会更稳。",
        accent: "var(--data-cyan)",
      },
      {
        label: completionLabel,
        value: String(completed),
        helper:
          range === "all"
            ? "这些任务已经处理完，可以安心放过它们。"
            : `${rangeLabel}已经完成这些，继续保持这个节奏。`,
        accent: "var(--data-indigo)",
      },
      {
        label: "已逾期",
        value: String(dueSummary.overdue),
        helper: `${rangeLabel}有些任务已经晚了，先把它们补回来。`,
        accent: "var(--danger)",
      },
      {
        label: "今天到期",
        value: String(dueSummary.today),
        helper: `${rangeLabel}今天到期的事，早点看会轻松些。`,
        accent: "var(--warning)",
      },
      {
        label: "3 天内到期",
        value: String(dueSummary.upcoming),
        helper: `${rangeLabel}这几天要靠近的任务，提前看一眼比较省心。`,
        accent: "var(--warning)",
      },
    ];
  }, [dueSummary.overdue, dueSummary.today, dueSummary.upcoming, isConfigured, range, rangeLabel, scopedTasks]);

  const priorityTasks = scopedTasks.filter((task) => task.status !== "done").slice(0, 4);
  const upcoming = activeScopedTasks
    .filter((task) => task.dueDate)
    .sort((a, b) => new Date(a.dueDate ?? "").getTime() - new Date(b.dueDate ?? "").getTime())
    .slice(0, 3);
  const activity = useMemo(() => buildActivityItems(scopedTasks), [scopedTasks]);
  const topTags = useMemo(() => buildTopTags(scopedTasks), [scopedTasks]);
  const completionTrend = useMemo(() => buildCompletionTrend(scopedTasks, range), [range, scopedTasks]);
  const statusDistribution = useMemo(
    () => [
      { label: "待开始", count: scopedTasks.filter((task) => task.status === "todo").length, color: "rgba(92,94,98,0.78)" },
      { label: "进行中", count: scopedTasks.filter((task) => task.status === "in_progress").length, color: "rgba(62,106,225,0.86)" },
      { label: "已完成", count: scopedTasks.filter((task) => task.status === "done").length, color: "rgba(16,185,129,0.88)" },
    ],
    [scopedTasks],
  );
  const progress = useMemo(() => {
    const completed = scopedTasks.filter((task) => task.status === "done").length;
    const completionRate = scopedTasks.length ? Math.round((completed / scopedTasks.length) * 100) : 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const overdueCount = scopedTasks.filter(
      (task) => task.status !== "done" && task.dueDate && new Date(task.dueDate) < today,
    ).length;

    return {
      completionRate,
      overdueCount,
      streakMessage:
        completed > 0
          ? `${rangeLabel}完成了 ${completed} 条，节奏还不错，先别急着加太多新事。`
          : `${rangeLabel}还没完成记录，先挑一条最重要的做掉就行。`,
    };
  }, [rangeLabel, scopedTasks]);

  const handleRangeChange = (nextRange: DashboardRange) => {
    setRange(nextRange);

    const params = new URLSearchParams(searchParams.toString());

    if (nextRange === "today") {
      params.delete("range");
    } else {
      params.set("range", nextRange);
    }

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  return (
    <>
      {!isConfigured ? (
        <section className="card-surface" style={{ borderRadius: 24, padding: 20 }}>
          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.7 }}>
            还没连 Appwrite，所以这里先用演示数据顶一下。
          </p>
        </section>
      ) : null}
      {error ? (
        <section className="card-surface" style={{ borderRadius: 24, padding: 20 }}>
          <p style={{ margin: 0, color: "var(--danger)", lineHeight: 1.7 }}>{error}</p>
        </section>
      ) : null}
      <AnimatedSection className="dashboard-hero">
        <TaskSignalPanel
          tasks={scopedTasks}
          eyebrow="任务总览"
          title={`${rangeLabel}的任务雷达已打开`}
          description="进度、状态灯和优先处理项都在这里。扫一眼，就知道先把注意力放到哪儿。"
          activeLabel={`${rangeLabel}优先处理`}
        />

        <aside
          className="card-surface"
          style={{
            borderRadius: 30,
            padding: 24,
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.92), rgba(237,245,255,0.88))",
            display: "grid",
            gap: 18,
            alignContent: "start",
          }}
        >
          <div>
            <p className="section-eyebrow" style={{ margin: 0, color: "var(--data-ink)", fontWeight: 700, fontSize: "0.82rem" }}>
              观察视角
            </p>
            <p style={{ margin: "10px 0 0", color: "var(--muted-strong)", lineHeight: 1.82 }}>
              想看今天、本周，还是全部，都可以在这里切换。别全靠记忆撑着。
            </p>
          </div>

          <div className="dashboard-range-panel">
            {rangeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleRangeChange(option.value)}
                className="ui-sans"
                style={{
                  border: range === option.value ? "1px solid transparent" : "1px solid var(--border)",
                  padding: "12px 16px",
                  borderRadius: 999,
                  fontWeight: 700,
                  background: range === option.value ? "linear-gradient(135deg, var(--primary), var(--data-cyan))" : "rgba(255,255,255,0.74)",
                  color: range === option.value ? "var(--primary-foreground)" : "var(--foreground)",
                  boxShadow: range === option.value ? "0 10px 24px rgba(37,99,235,0.18)" : "none",
                }}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div
            style={{
              padding: "16px 18px",
              borderRadius: 20,
              border: "1px solid var(--border)",
              background: "rgba(255,255,255,0.78)",
            }}
          >
            <p className="ui-sans" style={{ margin: 0, color: "var(--muted)", fontWeight: 600 }}>
              当前视角
            </p>
            <p style={{ margin: "6px 0 0", fontSize: "1.24rem", fontWeight: 700 }}>{rangeLabel}</p>
          </div>
        </aside>
      </AnimatedSection>
      <AnimatedSection delayMs={80}>
        <StatsGrid stats={stats} />
      </AnimatedSection>
      <AnimatedSection className="dashboard-analytics-grid" delayMs={120}>
        <CompletionTrendChart points={completionTrend} />
        <StatusDistributionChart items={statusDistribution} />
        <TagDistributionChart items={topTags.slice(0, 5)} />
      </AnimatedSection>
      <AnimatedSection className="dashboard-focus-grid" delayMs={160}>
        <div className="card-surface" style={{ borderRadius: 28, padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "baseline" }}>
            <div>
              <p className="section-eyebrow" style={{ margin: 0, color: "var(--primary)", fontWeight: 700, fontSize: "0.82rem" }}>
                优先事项
              </p>
              <h2 style={{ margin: "10px 0 0", fontSize: "1.28rem" }}>{prioritiesTitle}</h2>
            <p style={{ margin: "8px 0 0", color: "var(--muted-strong)" }}>
                {isLoading ? "正在同步任务，稍等一下..." : `${rangeLabel}先看这几条，别一开始就把所有事摊开。`}
              </p>
            </div>
          </div>
          <div style={{ marginTop: 20 }}>
            <TaskList tasks={priorityTasks} compact />
          </div>
        </div>

        <aside style={{ display: "grid", gap: 24 }}>
          <UpcomingDeadlines tasks={upcoming} />
          <ProgressOverview
            completionRate={progress.completionRate}
            overdueCount={progress.overdueCount}
            streakMessage={progress.streakMessage}
          />
          <TagSummary items={topTags} />
          <ActivityFeed items={activity} />
        </aside>
      </AnimatedSection>
    </>
  );
}

function filterTasksByRange(tasks: Task[], range: DashboardRange) {
  if (range === "all") {
    return tasks;
  }

  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);

  if (range === "today") {
    end.setDate(start.getDate() + 1);
  } else {
    end.setDate(start.getDate() + 7);
  }

  return tasks.filter((task) => {
    const checkpoints = [task.createdAt, task.updatedAt, task.completedAt, task.dueDate].filter(Boolean) as string[];

    return checkpoints.some((value) => {
      const timestamp = new Date(value).getTime();

      return !Number.isNaN(timestamp) && timestamp >= start.getTime() && timestamp < end.getTime();
    });
  });
}

function buildActivityItems(tasks: Task[]) {
  return tasks
    .flatMap((task) => {
      const items: Array<{
        id: string;
        title: string;
        summary: string;
        timestamp: string;
        tone: "success" | "info" | "warning";
      }> = [
        {
          id: `${task.id}-created`,
          title: "创建任务",
          summary: task.title,
          timestamp: task.createdAt,
          tone: "info" as const,
        },
      ];

      if (task.completedAt) {
        items.push({
          id: `${task.id}-completed`,
          title: "完成任务",
          summary: task.title,
          timestamp: task.completedAt,
          tone: "success" as const,
        });
      }

      if (task.updatedAt && task.updatedAt !== task.createdAt && task.updatedAt !== task.completedAt) {
        items.push({
          id: `${task.id}-updated`,
          title: "更新任务",
          summary: task.title,
          timestamp: task.updatedAt,
          tone: "warning" as const,
        });
      }

      return items;
    })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 5)
    .map((item) => ({
      ...item,
      timestampLabel: formatRelativeTime(item.timestamp),
    }));
}

function buildTopTags(tasks: Task[]) {
  const counter = new Map<string, number>();

  tasks.forEach((task) => {
    (task.tags ?? []).forEach((tag) => {
      counter.set(tag, (counter.get(tag) ?? 0) + 1);
    });
  });

  return Array.from(counter.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], "zh-CN"))
    .slice(0, 6)
    .map(([tag, count]) => ({ tag, count }));
}

function buildCompletionTrend(tasks: Task[], range: DashboardRange) {
  const bucketCount = range === "today" ? 6 : 7;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Array.from({ length: bucketCount }, (_, index) => {
    const day = new Date(today);
    day.setDate(today.getDate() - (bucketCount - index - 1));

    const nextDay = new Date(day);
    nextDay.setDate(day.getDate() + 1);

    const value = tasks.filter((task) => {
      if (!task.completedAt) {
        return false;
      }

      const completedAt = new Date(task.completedAt).getTime();

      return completedAt >= day.getTime() && completedAt < nextDay.getTime();
    }).length;

    return {
      label: formatTrendLabel(day),
      value,
    };
  });
}

function formatTrendLabel(date: Date) {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function formatRelativeTime(value: string) {
  const timestamp = new Date(value).getTime();

  if (Number.isNaN(timestamp)) {
    return value;
  }

  const diffInMinutes = Math.max(1, Math.round((Date.now() - timestamp) / 60000));

  if (diffInMinutes < 60) {
    return `${diffInMinutes} 分钟前`;
  }

  const diffInHours = Math.round(diffInMinutes / 60);

  if (diffInHours < 24) {
    return `${diffInHours} 小时前`;
  }

  const diffInDays = Math.round(diffInHours / 24);

  return `${diffInDays} 天前`;
}

function parseDashboardRange(value: string | null | undefined): DashboardRange {
  if (value === "week" || value === "all") {
    return value;
  }

  return "today";
}
