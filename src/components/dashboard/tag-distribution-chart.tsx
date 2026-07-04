type TagDistributionChartProps = {
  items: Array<{ tag: string; count: number }>;
};

export function TagDistributionChart({ items }: TagDistributionChartProps) {
  const maxCount = Math.max(1, ...items.map((item) => item.count));

  return (
    <section className="card-surface" style={{ borderRadius: 28, padding: 24 }}>
      <p className="section-eyebrow" style={{ margin: 0, color: "var(--data-indigo)", fontWeight: 700, fontSize: "0.82rem" }}>
        主题
      </p>
      <h2 style={{ margin: "10px 0 0", fontSize: "1.26rem" }}>标签分布</h2>
      <p style={{ margin: "8px 0 0", color: "var(--muted-strong)", lineHeight: 1.74 }}>
        按标签统计
      </p>
      <div style={{ marginTop: 18, display: "grid", gap: 14 }}>
        {items.length ? (
          items.map((item) => (
            <div key={item.tag} style={{ display: "grid", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <span className="ui-sans" style={{ fontWeight: 700, color: "var(--data-indigo)" }}>#{item.tag}</span>
                <span className="ui-sans metric-value" style={{ color: "var(--muted)" }}>{item.count} 条</span>
              </div>
              <div style={{ height: 12, borderRadius: 999, background: "rgba(31,41,55,0.08)", overflow: "hidden" }}>
                <div
                  style={{
                    width: `${Math.max(10, Math.round((item.count / maxCount) * 100))}%`,
                    height: "100%",
                    background: "linear-gradient(90deg, rgba(79,70,229,0.92), rgba(8,145,178,0.88))",
                    borderRadius: 999,
                  }}
                />
              </div>
            </div>
          ))
        ) : (
          <p style={{ margin: 0, color: "var(--muted-strong)", lineHeight: 1.7 }}>暂无标签分布</p>
        )}
      </div>
    </section>
  );
}

