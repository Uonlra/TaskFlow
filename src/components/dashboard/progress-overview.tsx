type ProgressOverviewProps = {
  completionRate: number;
  overdueCount: number;
  streakMessage: string;
};

export function ProgressOverview({ completionRate, overdueCount, streakMessage }: ProgressOverviewProps) {
  return (
    <section className="card-surface" style={{ borderRadius: 28, padding: 24 }}>
      <h2 style={{ margin: 0, fontSize: "1.1rem" }}>进度概览</h2>
      <div style={{ marginTop: 18, display: "grid", gap: 16 }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <span style={{ color: "var(--muted)", fontWeight: 600 }}>完成率</span>
            <span style={{ fontWeight: 800 }}>{completionRate}%</span>
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
                background: "linear-gradient(90deg, var(--primary), #e29f58)",
              }}
            />
          </div>
        </div>
        <div style={{ padding: 16, borderRadius: 20, background: "rgba(255,255,255,0.72)", border: "1px solid var(--border)" }}>
          <p style={{ margin: 0, color: "var(--muted)" }}>已逾期任务</p>
          <p style={{ margin: "8px 0 0", fontSize: "1.7rem", fontWeight: 800 }}>{overdueCount}</p>
        </div>
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.7 }}>{streakMessage}</p>
      </div>
    </section>
  );
}
