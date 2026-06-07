import { StatsCard } from "@/components/dashboard/stats-card";
type DashboardStat = {
  label: string;
  value: string;
  helper: string;
  accent?: string;
};

type StatsGridProps = {
  stats: DashboardStat[];
};

export function StatsGrid({ stats }: StatsGridProps) {
  return (
    <section className="stats-grid">
      {stats.map((stat) => (
        <StatsCard key={stat.label} label={stat.label} value={stat.value} helper={stat.helper} accent={stat.accent} />
      ))}
    </section>
  );
}
