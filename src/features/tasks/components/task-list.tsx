import type { CSSProperties, ReactNode } from "react";

import { ScrambleText } from "@/shared/components/common/scramble-text";
import { EmptyState } from "@/shared/components/common/empty-state";
import { TaskCard } from "@/features/tasks/components/task-card";
import type { TaskFormValues } from "@/features/tasks/schemas/task-schema";
import type { Task } from "@/features/tasks/types/task.types";

type TaskListProps = {
  tasks: Task[];
  compact?: boolean;
  motionKey?: string;
  emptyAction?: ReactNode;
  onUpdateTask?: (id: string, values: TaskFormValues) => void | Promise<void>;
  onDeleteTask?: (id: string) => void | Promise<void>;
  onUpdateStatus?: (id: string, status: Task["status"]) => void | Promise<void>;
};

export function TaskList({
  tasks,
  compact = false,
  motionKey,
  emptyAction,
  onUpdateTask,
  onDeleteTask,
  onUpdateStatus,
}: TaskListProps) {
  if (!tasks.length) {
    return (
      <EmptyState
        title={<ScrambleText text="这里暂时很安静" playKey={motionKey ?? "empty-task-list"} />}
        description="可以放宽筛选条件，或者新建一条任务，先把要做的事放进来。"
        action={emptyAction}
      />
    );
  }

  return (
    <div key={motionKey} className={compact ? "task-list task-list--compact task-list--motion" : "task-list task-list--motion"}>
      {tasks.map((task, index) => {
        const animationStyle = { "--task-delay": `${Math.min(index, 8) * 48}ms` } as CSSProperties;

        return (
          <div key={task.id} className="task-list__item" style={animationStyle}>
            <TaskCard
              task={task}
              compact={compact}
              onUpdateTask={onUpdateTask}
              onDeleteTask={onDeleteTask}
              onUpdateStatus={onUpdateStatus}
            />
          </div>
        );
      })}
    </div>
  );
}
