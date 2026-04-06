type CompletionTrendPoint = {
  label: string;
  value: number;
};

type CompletionTrendChartProps = {
  points: CompletionTrendPoint[];
};

export function CompletionTrendChart({ points }: CompletionTrendChartProps) {
  const maxValue = Math.max(1, ...points.map((point) => point.value));
  const svgWidth = 320;
  const svgHeight = 160;
  const padding = 18;
  const stepX = points.length > 1 ? (svgWidth - padding * 2) / (points.length - 1) : 0;

  const linePath = points
    .map((point, index) => {
      const x = padding + stepX * index;
      const y = svgHeight - padding - (point.value / maxValue) * (svgHeight - padding * 2);
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  return (
    <section className="card-surface" style={{ borderRadius: 28, padding: 24 }}>
      <h2 style={{ margin: 0, fontSize: "1.1rem" }}>完成趋势</h2>
      <p style={{ margin: "8px 0 0", color: "var(--muted)", lineHeight: 1.7 }}>观察当前范围内最近几天的任务完成节奏。</p>
      <div style={{ marginTop: 18 }}>
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ width: "100%", height: "auto", display: "block" }} aria-hidden="true">
          <defs>
            <linearGradient id="completion-trend-line" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--primary)" />
              <stop offset="100%" stopColor="#e29f58" />
            </linearGradient>
          </defs>
          {[0, 1, 2].map((row) => {
            const y = padding + ((svgHeight - padding * 2) / 2) * row;

            return <line key={row} x1={padding} y1={y} x2={svgWidth - padding} y2={y} stroke="rgba(31,41,55,0.08)" strokeWidth="1" />;
          })}
          <path d={linePath} fill="none" stroke="url(#completion-trend-line)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((point, index) => {
            const x = padding + stepX * index;
            const y = svgHeight - padding - (point.value / maxValue) * (svgHeight - padding * 2);

            return (
              <g key={point.label}>
                <circle cx={x} cy={y} r="4.5" fill="var(--surface-strong)" stroke="var(--primary)" strokeWidth="2.5" />
              </g>
            );
          })}
        </svg>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))`, gap: 10, marginTop: 10 }}>
          {points.map((point) => (
            <div key={point.label} style={{ textAlign: "center" }}>
              <p style={{ margin: 0, fontWeight: 700 }}>{point.value}</p>
              <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: "0.85rem" }}>{point.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
