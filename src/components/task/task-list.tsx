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
        title="这里暂时很安静"
        description="可以放宽筛选条件，或者新增一条任务，让工作台有点正事可做。"
        action={emptyAction}
      />
    );
  }

  return (
    <div className={compact ? "task-list task-list--compact" : "task-list"}>
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
