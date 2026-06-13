import Link from "next/link";

import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { CompletionTrendChart } from "@/components/dashboard/completion-trend-chart";
import { ProgressOverview } from "@/components/dashboard/progress-overview";
import { StatsGrid } from "@/components/dashboard/stats-grid";
import { StatusDistributionChart } from "@/components/dashboard/status-distribution-chart";
import { TagSummary } from "@/components/dashboard/tag-summary";
import { UpcomingDeadlines } from "@/components/dashboard/upcoming-deadlines";
import { TaskPriorityBadge } from "@/components/task/task-priority-badge";
import { TaskStatusBadge } from "@/components/task/task-status-badge";
import type { Task } from "@/features/tasks/types/task.types";
import { getTaskDueMeta } from "@/features/tasks/utils/task-deadline";
import { tasks } from "@/mock/tasks";

type DemoActivityItem = {
  id: string;
  title: string;
  summary: string;
  timestamp: string;
  tone: "success" | "info" | "warning";
};

export const metadata = {
  title: "公开演示 - U's Task",
  description: "无需登录即可预览 U's Task 的任务工作台演示数据。",
};

export default function DemoPage() {
  const openTasks = tasks.filter((task) => task.status !== "done");
  const completedTasks = tasks.filter((task) => task.status === "done");
  const inProgressTasks = tasks.filter((task) => task.status === "in_progress");
  const overdueCount = openTasks.filter((task) => getTaskDueMeta(task).isOverdue).length;
  const dueTodayCount = openTasks.filter((task) => getTaskDueMeta(task).isDueToday).length;
  const upcomingCount = openTasks.filter((task) => getTaskDueMeta(task).isUpcoming).length;
  const completionRate = tasks.length ? Math.round((completedTasks.length / tasks.length) * 100) : 0;
  const topTags = buildTopTags(tasks);
  const activity = buildActivityItems(tasks);
  const upcoming = openTasks
    .filter((task) => task.dueDate)
    .sort((a, b) => new Date(a.dueDate ?? "").getTime() - new Date(b.dueDate ?? "").getTime())
    .slice(0, 3);
  const completionTrend = buildCompletionTrend(tasks);
  const statusDistribution = [
    { label: "待开始", count: tasks.filter((task) => task.status === "todo").length, color: "rgba(37,99,235,0.82)" },
    { label: "进行中", count: inProgressTasks.length, color: "rgba(8,145,178,0.88)" },
    { label: "已完成", count: completedTasks.length, color: "rgba(79,70,229,0.86)" },
  ];
  const stats = [
    {
      label: "演示任务",
      value: String(tasks.length),
      helper: "这里使用本地 mock 数据，不需要登录，也不会写入真实账号。",
      accent: "var(--primary)",
    },
    {
      label: "进行中",
      value: String(inProgressTasks.length),
      helper: "先看看任务卡片、状态和标签的整体手感。",
      accent: "var(--data-cyan)",
    },
    {
      label: "已完成",
      value: String(completedTasks.length),
      helper: "完成记录会影响趋势、进度和最近活动。",
      accent: "var(--data-indigo)",
    },
    {
      label: "已逾期",
      value: String(overdueCount),
      helper: "演示数据会保留一些提醒场景，方便检查界面表现。",
      accent: "var(--danger)",
    },
    {
      label: "今天到期",
      value: String(dueTodayCount),
      helper: "到期提醒会在真实工作台里跟随任务日期变化。",
      accent: "var(--warning)",
    },
    {
      label: "3 天内到期",
      value: String(upcomingCount),
      helper: "提前看到快靠近的任务，少一点临时抱佛脚。",
      accent: "var(--warning)",
    },
  ];

  return (
    <main className="demo-page">
      <section className="demo-shell">
        <header className="demo-topbar">
          <div>
            <p className="demo-brand">U&apos;s Task</p>
            <h1>公开演示工作台</h1>
            <p>
              不用登录，先用一组本地任务看看总览、标签、进度和移动端布局。真实数据仍然只在登录后展示。
            </p>
          </div>
          <div className="demo-actions">
            <Link href="/login" className="tesla-action tesla-action--secondary">
              登录
            </Link>
            <Link href="/register" className="tesla-action tesla-action--primary">
              注册
            </Link>
          </div>
        </header>

        <section className="demo-hero-grid">
          <article className="card-surface demo-hero-card">
            <p className="section-eyebrow panel-eyebrow">Demo Preview</p>
            <h2>
              先看一眼，
              <br />
              再决定要不要开工
            </h2>
            <p>
              这页只负责展示产品手感：任务状态、标签分布、趋势图和最近活动都来自 mock 数据。
            </p>
          </article>
          <ProgressOverview
            completionRate={completionRate}
            overdueCount={overdueCount}
            streakMessage={`演示任务完成率 ${completionRate}%。真正登录后，这里会换成你的任务节奏。`}
          />
        </section>

        <StatsGrid stats={stats} />

        <section className="dashboard-analytics-grid">
          <CompletionTrendChart points={completionTrend} />
          <StatusDistributionChart items={statusDistribution} />
          <TagSummary items={topTags} />
        </section>

        <section className="dashboard-focus-grid">
          <section className="card-surface demo-task-panel">
            <div>
              <p className="section-eyebrow panel-eyebrow">任务样例</p>
              <h2>标签、状态和日期都会一起展示</h2>
              <p>这里是只读演示。想创建或编辑任务，可以登录后进入完整工作台。</p>
            </div>
            <div className="demo-task-list">
              {tasks.map((task) => (
                <DemoTaskCard key={task.id} task={task} />
              ))}
            </div>
          </section>

          <aside className="demo-side-stack">
            <UpcomingDeadlines tasks={upcoming} />
            <ActivityFeed items={activity} />
            <TagSummary items={topTags} />
          </aside>
        </section>
      </section>
    </main>
  );
}

function DemoTaskCard({ task }: { task: Task }) {
  const dueMeta = getTaskDueMeta(task);
  const cardToneClassName = task.status === "done"
    ? " task-card--done"
    : dueMeta.isOverdue
      ? " task-card--attention"
      : "";

  return (
    <article className={`task-card${cardToneClassName}`}>
      <div className="task-card__header">
        <div>
          <h3 className="task-card__title">{task.title}</h3>
          <p className="task-card__description">{task.description}</p>
        </div>
        <TaskStatusBadge status={task.status} />
      </div>
      <div className="task-card__meta">
        <TaskPriorityBadge priority={task.priority} />
        <span className={dueMeta.tone === "danger" ? "task-meta-pill task-meta-pill--danger" : "task-meta-pill"}>
          {dueMeta.label}
        </span>
        {task.tags.map((tag) => (
          <span key={tag} className="task-meta-pill task-meta-pill--success">
            #{tag}
          </span>
        ))}
      </div>
    </article>
  );
}

function buildTopTags(inputTasks: Task[]) {
  const counter = new Map<string, number>();

  inputTasks.forEach((task) => {
    task.tags.forEach((tag) => {
      counter.set(tag, (counter.get(tag) ?? 0) + 1);
    });
  });

  return Array.from(counter.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], "zh-CN"))
    .slice(0, 6)
    .map(([tag, count]) => ({ tag, count }));
}

function buildActivityItems(inputTasks: Task[]) {
  return inputTasks
    .flatMap((task) => {
      const items: DemoActivityItem[] = [
        {
          id: `${task.id}-created`,
          title: "创建任务",
          summary: task.title,
          timestamp: task.createdAt,
          tone: "info" as const,
        },
      ];

      if (task.updatedAt) {
        items.push({
          id: `${task.id}-updated`,
          title: "更新任务",
          summary: task.title,
          timestamp: task.updatedAt,
          tone: "warning" as const,
        });
      }

      if (task.completedAt) {
        items.push({
          id: `${task.id}-completed`,
          title: "完成任务",
          summary: task.title,
          timestamp: task.completedAt,
          tone: "success" as const,
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

function buildCompletionTrend(inputTasks: Task[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(today);
    day.setDate(today.getDate() - (6 - index));

    const nextDay = new Date(day);
    nextDay.setDate(day.getDate() + 1);

    const value = inputTasks.filter((task) => {
      if (!task.completedAt) {
        return false;
      }

      const completedAt = new Date(task.completedAt).getTime();

      return completedAt >= day.getTime() && completedAt < nextDay.getTime();
    }).length;

    return {
      label: `${day.getMonth() + 1}/${day.getDate()}`,
      value,
    };
  });
}

function formatRelativeTime(value: string) {
  const timestamp = new Date(value);

  if (Number.isNaN(timestamp.getTime())) {
    return value;
  }

  return timestamp.toLocaleDateString("zh-CN", {
    month: "numeric",
    day: "numeric",
  });
}
