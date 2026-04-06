import type { TaskStatus } from "@/features/tasks/types/task.types";

const styles: Record<TaskStatus, { background: string; color: string }> = {
  todo: { background: "rgba(183, 121, 31, 0.12)", color: "var(--warning)" },
  in_progress: { background: "rgba(199, 91, 57, 0.12)", color: "var(--primary)" },
  done: { background: "rgba(44, 122, 90, 0.12)", color: "var(--success)" },
};

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const label = status === "todo" ? "待开始" : status === "in_progress" ? "进行中" : "已完成";

  return (
    <span
      style={{
        display: "inline-flex",
        padding: "8px 12px",
        borderRadius: 999,
        fontWeight: 700,
        fontSize: "0.84rem",
        background: styles[status].background,
        color: styles[status].color,
      }}
    >
      {label}
    </span>
  );
}
