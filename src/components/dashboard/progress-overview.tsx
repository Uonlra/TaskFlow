type ProgressOverviewProps = {
  completionRate: number;
  overdueCount: number;
  streakMessage: string;
};

export function ProgressOverview({ completionRate, overdueCount, streakMessage }: ProgressOverviewProps) {
  return (
    <section className="card-surface" style={{ borderRadius: 28, padding: 24 }}>
      <p className="section-eyebrow" style={{ margin: 0, color: "var(--data-ink)", fontWeight: 700, fontSize: "0.82rem" }}>
        节奏
      </p>
      <h2 style={{ margin: "10px 0 0", fontSize: "1.18rem" }}>推进节奏</h2>
      <div style={{ marginTop: 18, display: "grid", gap: 16 }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <span className="ui-sans" style={{ color: "var(--muted)", fontWeight: 600 }}>完成率</span>
            <span className="metric-value" style={{ fontWeight: 800 }}>{completionRate}%</span>
          </div>
          <div
            style={{
              marginTop: 10,
              height: 12,
              borderRadius: 999,
              background: "rgba(31,41,55,0.08)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${completionRate}%`,
                height: "100%",
                background: "linear-gradient(90deg, var(--data-ink), var(--primary))",
              }}
            />
          </div>
        </div>
        <div style={{ padding: 16, borderRadius: 20, background: "rgba(255,255,255,0.72)", border: "1px solid var(--border)" }}>
          <p className="ui-sans" style={{ margin: 0, color: "var(--muted)" }}>已逾期任务</p>
          <p className="metric-value" style={{ margin: "8px 0 0", fontSize: "1.7rem", fontWeight: 800 }}>{overdueCount}</p>
        </div>
        <p style={{ margin: 0, color: "var(--muted-strong)", lineHeight: 1.74 }}>{streakMessage}</p>
      </div>
    </section>
  );
}
