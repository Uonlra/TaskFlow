import type { ReactNode } from "react";
import { EmptyState } from "@/components/common/empty-state";
import { TaskCard } from "@/components/task/task-card";
import type { TaskFormValues } from "@/features/tasks/schemas/task-schema";
import type { Task } from "@/features/tasks/types/task.types";

type TaskListProps = {
  tasks: Task[];
  compact?: boolean;
  emptyAction?: ReactNode;
  onUpdateTask?: (id: string, values: TaskFormValues) => void | Promise<void>;
  onDeleteTask?: (id: string) => void | Promise<void>;
  onUpdateStatus?: (id: string, status: Task["status"]) => void | Promise<void>;
};

export function TaskList({
  tasks,
  compact = false,
  emptyAction,
  onUpdateTask,
  onDeleteTask,
  onUpdateStatus,
}: TaskListProps) {
  if (!tasks.length) {
    return (
      <EmptyState
        title="当前条件下没有任务"
        description="可以调整筛选条件，或者先新增一条任务继续推进。"
        action={emptyAction}
      />
    );
  }

  return (
    <div style={{ display: "grid", gap: compact ? 14 : 18 }}>
      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          compact={compact}
          onUpdateTask={onUpdateTask}
          onDeleteTask={onDeleteTask}
          onUpdateStatus={onUpdateStatus}
        />
      ))}
    </div>
  );
}
