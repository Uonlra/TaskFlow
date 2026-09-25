"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";

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
  const [scale, setScale] = useState(1);
  const [isStaticMode, setIsStaticMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ x: 0, y: 0, rotationX: 0, rotationY: 0 });
  const visibleTasks = useMemo(() => tasks.filter((task) => task.status !== "done").slice(0, 8), [tasks]);
  const hasTasks = visibleTasks.length > 0;

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateStaticMode = () => setIsStaticMode(mediaQuery.matches);

    updateStaticMode();
    mediaQuery.addEventListener("change", updateStaticMode);

    return () => mediaQuery.removeEventListener("change", updateStaticMode);
  }, []);

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

  const handleWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    setScale((current) => Math.max(0.82, Math.min(1.24, current - event.deltaY * 0.001)));
  };

  return (
    <section className="dashboard-empty-orbit" aria-label="任务数据空间">
      <div
        ref={spaceRef}
        className={`dashboard-empty-orbit__space${isDragging ? " is-dragging" : ""}${isStaticMode ? " is-static" : ""}`}
        data-render-mode={isStaticMode ? "static" : "interactive"}
        onPointerDown={handlePointerDown}
        onWheel={handleWheel}
        style={{
          transform: `perspective(900px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) scale(${scale})`,
        }}
      >
        <div className="dashboard-empty-orbit__grid" aria-hidden="true" />
        <div className="dashboard-empty-orbit__core" aria-hidden="true">
          <span />
        </div>
        {(hasTasks ? visibleTasks : fallbackNodes.map((title, index) => ({ id: `fallback-${index}`, title }))).map(
          (node, index) => {
            const task = hasTasks ? (node as DashboardTaskPreview) : undefined;
            const taskTone = task
              ? ` dashboard-empty-orbit__node--${task.priority} dashboard-empty-orbit__node--${task.status}`
              : "";

            return task ? (
              <button
                key={task.id}
                type="button"
                className={`dashboard-empty-orbit__node dashboard-empty-orbit__node--position-${index % 8}${taskTone}`}
                onClick={() => onPreviewTask(task)}
                aria-label={task.title}
                data-tooltip={`${getTaskStatusLabel(task.status)} · ${getTaskPriorityLabel(task.priority)} · ${task.dueLabel}`}
                style={{ animationDelay: `${index * -0.8}s` }}
              >
                <span className="dashboard-empty-orbit__node-dot" aria-hidden="true" />
                <span>{task.title}</span>
              </button>
            ) : (
              <span
                key={node.id}
                className={`dashboard-empty-orbit__node dashboard-empty-orbit__node--ghost dashboard-empty-orbit__node--position-${index % 8}`}
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

function getTaskStatusLabel(status: DashboardTaskPreview["status"]) {
  return status === "in_progress" ? "进行中" : status === "done" ? "已完成" : "待开始";
}

function getTaskPriorityLabel(priority: DashboardTaskPreview["priority"]) {
  return priority === "high" ? "高优先级" : priority === "medium" ? "中优先级" : "低优先级";
}
