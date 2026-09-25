"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

import { TaskFormDialog } from "@/features/tasks/components/task-form-dialog";
import type { TaskFormValues } from "@/features/tasks/schemas/task-schema";
import type { DashboardTaskPreview } from "@/features/tasks/utils/task-analytics";

type DashboardEmptyOrbitProps = {
  tasks: DashboardTaskPreview[];
  onPreviewTask: (task: DashboardTaskPreview) => void;
  onCreateTask: (values: TaskFormValues) => Promise<void>;
};

const fallbackNodes = ["START", "FOCUS", "FLOW", "NEXT", "BUILD", "PACE"];

export function DashboardEmptyOrbit({ tasks, onPreviewTask, onCreateTask }: DashboardEmptyOrbitProps) {
  const spaceRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState({ x: -8, y: 12 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ x: 0, y: 0, rotationX: 0, rotationY: 0 });
  const visibleTasks = useMemo(() => tasks.filter((task) => task.status !== "done").slice(0, 8), [tasks]);
  const hasTasks = visibleTasks.length > 0;

  useEffect(() => {
    const element = spaceRef.current;

    if (!element) return;

    const handlePointerMove = (event: globalThis.PointerEvent) => {
      if (!isDragging) return;

      setRotation({
        x: Math.max(-24, Math.min(24, dragRef.current.rotationX + (event.clientY - dragRef.current.y) * 0.18)),
        y: dragRef.current.rotationY + (event.clientX - dragRef.current.x) * 0.18,
      });
    };
    const handlePointerUp = () => setIsDragging(false);

    element.addEventListener("pointermove", handlePointerMove);
    element.addEventListener("pointerup", handlePointerUp);
    element.addEventListener("pointercancel", handlePointerUp);

    return () => {
      element.removeEventListener("pointermove", handlePointerMove);
      element.removeEventListener("pointerup", handlePointerUp);
      element.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [isDragging]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button")) return;

    dragRef.current = { x: event.clientX, y: event.clientY, rotationX: rotation.x, rotationY: rotation.y };
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  return (
    <section className="dashboard-empty-orbit" aria-label="任务数据空间">
      <div
        ref={spaceRef}
        className={`dashboard-empty-orbit__space${isDragging ? " is-dragging" : ""}`}
        onPointerDown={handlePointerDown}
        style={{ transform: `perspective(900px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)` }}
      >
        <div className="dashboard-empty-orbit__grid" aria-hidden="true" />
        <div className="dashboard-empty-orbit__core" aria-hidden="true">
          <span />
        </div>
        {(hasTasks ? visibleTasks : fallbackNodes.map((title, index) => ({ id: `fallback-${index}`, title }))).map(
          (node, index) => {
            const task = hasTasks ? (node as DashboardTaskPreview) : undefined;

            return task ? (
              <button
                key={task.id}
                type="button"
                className={`dashboard-empty-orbit__node dashboard-empty-orbit__node--${index % 5}`}
                onClick={() => onPreviewTask(task)}
                style={{ animationDelay: `${index * -0.8}s` }}
              >
                <span className="dashboard-empty-orbit__node-dot" aria-hidden="true" />
                <span>{task.title}</span>
              </button>
            ) : (
              <span
                key={node.id}
                className={`dashboard-empty-orbit__node dashboard-empty-orbit__node--ghost dashboard-empty-orbit__node--${index % 5}`}
                style={{ animationDelay: `${index * -0.8}s` }}
              >
                <span className="dashboard-empty-orbit__node-dot" aria-hidden="true" />
                <span>{node.title}</span>
              </span>
            );
          },
        )}
        <div className="dashboard-empty-orbit__center">
          <span className="dashboard-empty-orbit__center-kicker">TASK SPACE</span>
          <strong>{hasTasks ? "未完成任务" : "空白空间"}</strong>
          <TaskFormDialog
            onSubmitTask={onCreateTask}
            triggerLabel="创建任务"
            triggerClassName="dashboard-empty-orbit__create"
          />
        </div>
      </div>
      <p className="dashboard-empty-orbit__hint">拖动探索任务空间</p>
    </section>
  );
}
