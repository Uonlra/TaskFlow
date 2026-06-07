type StatsCardProps = {
  label: string;
  value: string;
  helper: string;
  accent?: string;
};

export function StatsCard({ label, value, helper, accent = "var(--primary)" }: StatsCardProps) {
  return (
    <article className="stats-card">
      <p className="stats-card__label">
        {label}
      </p>
      <p className="stats-card__value">
        {value}
      </p>
      <div className="stats-card__line" style={{ background: accent }} />
      <p className="stats-card__helper">{helper}</p>
    </article>
  );
}
