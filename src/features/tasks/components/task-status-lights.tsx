export type TaskSignalTone = "neutral" | "info" | "success" | "warning" | "danger";

export type TaskStatusLightItem = {
  label: string;
  value: number;
  helper: string;
  tone: TaskSignalTone;
  active?: boolean;
};

type TaskStatusLightsProps = {
  items: TaskStatusLightItem[];
};

export function TaskStatusLights({ items }: TaskStatusLightsProps) {
  return (
    <div className="task-status-lights" aria-label="任务状态灯">
      {items.map((item) => (
        <div key={item.label} className="task-status-light">
          <StatusDot tone={item.tone} active={item.active ?? item.value > 0} />
          <div className="task-status-light__copy">
            <span className="task-status-light__label">{item.label}</span>
            <strong className="task-status-light__value metric-value">{item.value}</strong>
            <span className="task-status-light__helper">{item.helper}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function StatusDot({
  tone,
  active = true,
  className = "",
}: {
  tone: TaskSignalTone;
  active?: boolean;
  className?: string;
}) {
  const activeClassName = active ? " status-dot--active" : "";

  return (
    <span
      className={`status-dot status-dot--${tone}${activeClassName}${className ? ` ${className}` : ""}`}
      aria-hidden="true"
    />
  );
}
