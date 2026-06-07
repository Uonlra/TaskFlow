import type { TaskPriority } from "@/features/tasks/types/task.types";

const styles: Record<TaskPriority, { color: string }> = {
  low: { color: "var(--muted)" },
  medium: { color: "var(--primary)" },
  high: { color: "var(--danger)" },
};

export function TaskPriorityBadge({ priority }: { priority: TaskPriority }) {
  const label = priority === "high" ? "高优先级" : priority === "medium" ? "中优先级" : "低优先级";

  return (
    <span className="task-badge" style={{ color: styles[priority].color }}>
      {label}
    </span>
  );
}
