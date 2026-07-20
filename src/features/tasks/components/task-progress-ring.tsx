type TaskProgressRingProps = {
  value: number;
  label?: string;
  helper?: string;
};

export function TaskProgressRing({ value, label = "完成率", helper }: TaskProgressRingProps) {
  const normalizedValue = Math.min(100, Math.max(0, value));
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (normalizedValue / 100) * circumference;

  return (
    <div className="task-progress-ring" aria-label={`${label} ${normalizedValue}%`}>
      <svg className="task-progress-ring__chart" viewBox="0 0 120 120" role="img" aria-hidden="true">
        <circle className="task-progress-ring__track" cx="60" cy="60" r={radius} />
        <circle
          className="task-progress-ring__value"
          cx="60"
          cy="60"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <div className="task-progress-ring__content">
        <span className="task-progress-ring__value-text metric-value">{normalizedValue}%</span>
        <span className="task-progress-ring__label">{label}</span>
      </div>
      {helper ? <p className="task-progress-ring__helper">{helper}</p> : null}
    </div>
  );
}
