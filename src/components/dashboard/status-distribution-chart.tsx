type StatusDistributionChartProps = {
  items: Array<{ label: string; count: number; color: string }>;
};

export function StatusDistributionChart({ items }: StatusDistributionChartProps) {
  const total = items.reduce((sum, item) => sum + item.count, 0);

  return (
    <section className="card-surface" style={{ borderRadius: 28, padding: 24 }}>
      <p className="section-eyebrow" style={{ margin: 0, color: "var(--data-cyan)", fontWeight: 700, fontSize: "0.82rem" }}>
        结构
      </p>
      <h2 style={{ margin: "10px 0 0", fontSize: "1.26rem" }}>状态分布</h2>
      <p style={{ margin: "8px 0 0", color: "var(--muted-strong)", lineHeight: 1.74 }}>
        看看当前范围里的任务都停在哪个阶段。
      </p>
      <div style={{ marginTop: 18, display: "grid", gap: 14 }}>
        {items.map((item) => {
          const width = total ? `${Math.max(8, Math.round((item.count / total) * 100))}%` : "8%";

          return (
            <div key={item.label} style={{ display: "grid", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <span className="ui-sans" style={{ fontWeight: 700 }}>{item.label}</span>
                <span className="ui-sans metric-value" style={{ color: "var(--muted)" }}>{item.count} 条</span>
              </div>
              <div style={{ height: 12, borderRadius: 999, background: "rgba(31,41,55,0.08)", overflow: "hidden" }}>
                <div style={{ width, height: "100%", background: item.color, borderRadius: 999 }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
