import type { TaskStatus } from "@/features/tasks/types/task.types";

const styles: Record<TaskStatus, { color: string }> = {
  todo: { color: "var(--primary)" },
  in_progress: { color: "var(--muted-strong)" },
  done: { color: "var(--muted)" },
};

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const label = status === "todo" ? "待开始" : status === "in_progress" ? "进行中" : "已完成";

  return (
    <span className="task-badge" style={{ color: styles[status].color }}>
      {label}
    </span>
  );
}
