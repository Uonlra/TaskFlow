import type { TaskPriority } from "@/features/tasks/types/task.types";

const styles: Record<TaskPriority, { background: string; color: string }> = {
  low: { background: "rgba(44, 122, 90, 0.12)", color: "var(--success)" },
  medium: { background: "rgba(183, 121, 31, 0.12)", color: "var(--warning)" },
  high: { background: "rgba(178, 64, 55, 0.12)", color: "var(--danger)" },
};

export function TaskPriorityBadge({ priority }: { priority: TaskPriority }) {
  const label = priority === "high" ? "高优先级" : priority === "medium" ? "中优先级" : "低优先级";

  return (
    <span
      style={{
        display: "inline-flex",
        padding: "8px 12px",
        borderRadius: 999,
        fontWeight: 700,
        fontSize: "0.84rem",
        background: styles[priority].background,
        color: styles[priority].color,
      }}
    >
      {label}
    </span>
  );
}
