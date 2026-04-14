import type { TaskStatus } from "@/features/tasks/types/task.types";

const styles: Record<TaskStatus, { background: string; color: string }> = {
  todo: { background: "rgba(37,99,235,0.1)", color: "var(--data-ink)" },
  in_progress: { background: "rgba(8,145,178,0.12)", color: "var(--data-cyan)" },
  done: { background: "rgba(79,70,229,0.12)", color: "var(--data-indigo)" },
};

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const label = status === "todo" ? "待开始" : status === "in_progress" ? "进行中" : "已完成";

  return (
    <span
      className="ui-sans"
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
