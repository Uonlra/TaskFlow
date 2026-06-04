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
        padding: "22px 22px 20px",
        background: `linear-gradient(180deg, rgba(255,255,255,0.9), rgba(249,251,255,0.82)), radial-gradient(circle at top right, ${accent}1f, transparent 36%)`,
        minWidth: 0,
      }}
    >
      <p className="ui-sans" style={{ margin: 0, color: "var(--muted)", fontSize: "0.9rem", fontWeight: 600 }}>
        {label}
      </p>
      <p className="metric-value" style={{ margin: "16px 0 0", fontSize: "clamp(2.1rem, 4vw, 2.6rem)", fontWeight: 700 }}>
        {value}
      </p>
      <div style={{ width: 44, height: 2, borderRadius: 999, background: `${accent}55`, marginTop: 14 }} />
      <p style={{ margin: "12px 0 0", color: "var(--muted-strong)", lineHeight: 1.78 }}>{helper}</p>
    </article>
  );
}
