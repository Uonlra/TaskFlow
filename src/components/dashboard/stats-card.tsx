type StatsCardProps = {
  label: string;
  value: string;
  helper: string;
  accent?: string;
};

export function StatsCard({ label, value, helper, accent = "var(--primary)" }: StatsCardProps) {
  return (
    <article
      className="card-surface"
      style={{
        borderRadius: 28,
        padding: "24px 24px 22px",
        background: `linear-gradient(180deg, rgba(255,255,255,0.82), rgba(255,255,255,0.72)), radial-gradient(circle at top right, ${accent}22, transparent 36%)`,
      }}
    >
      <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.92rem", letterSpacing: "0.04em" }}>{label}</p>
      <p style={{ margin: "14px 0 0", fontSize: "2.2rem", fontWeight: 700 }}>{value}</p>
      <p style={{ margin: "12px 0 0", color: "var(--muted)", lineHeight: 1.78 }}>{helper}</p>
    </article>
  );
}
