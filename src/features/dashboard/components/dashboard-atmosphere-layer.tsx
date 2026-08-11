type DashboardAtmosphereLayerProps = {
  enabled?: boolean;
  variant?: "dom" | "canvas";
};

const nodes = [
  { className: "dashboard-v2-atmosphere__node--primary", label: "完成" },
  { className: "dashboard-v2-atmosphere__node--success", label: "进行" },
  { className: "dashboard-v2-atmosphere__node--warning", label: "截止" },
  { className: "dashboard-v2-atmosphere__node--danger", label: "风险" },
];

export function DashboardAtmosphereLayer({
  enabled = true,
  variant = "dom",
}: DashboardAtmosphereLayerProps) {
  if (!enabled) {
    return null;
  }

  if (variant === "canvas") {
    return (
      <div className="dashboard-v2-atmosphere dashboard-v2-atmosphere--canvas" aria-hidden="true">
        <canvas className="dashboard-v2-atmosphere__canvas" />
      </div>
    );
  }

  return (
    <div className="dashboard-v2-atmosphere dashboard-v2-atmosphere--dom" aria-hidden="true">
      <span className="dashboard-v2-atmosphere__line dashboard-v2-atmosphere__line--one" />
      <span className="dashboard-v2-atmosphere__line dashboard-v2-atmosphere__line--two" />
      <span className="dashboard-v2-atmosphere__line dashboard-v2-atmosphere__line--three" />
      <span className="dashboard-v2-atmosphere__line dashboard-v2-atmosphere__line--four" />
      {nodes.map((node) => (
        <span key={node.label} className={`dashboard-v2-atmosphere__node ${node.className}`}>
          <span>{node.label}</span>
        </span>
      ))}
      <span className="dashboard-v3-atmosphere__dot dashboard-v2-atmosphere__dot--one" />
      <span className="dashboard-v2-atmosphere__dot dashboard-v2-atmosphere__dot--two" />
      <span className="dashboard-v2-atmosphere__dot dashboard-v2-atmosphere__dot--three" />
    </div>
  );
}
