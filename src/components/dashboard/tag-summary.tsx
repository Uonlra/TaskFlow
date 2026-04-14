type TagSummaryProps = {
  items: Array<{ tag: string; count: number }>;
};

export function TagSummary({ items }: TagSummaryProps) {
  return (
    <section className="card-surface" style={{ borderRadius: 28, padding: 24 }}>
      <p className="section-eyebrow" style={{ margin: 0, color: "var(--data-indigo)", fontWeight: 700, fontSize: "0.82rem" }}>
        摘要
      </p>
      <h2 style={{ margin: "10px 0 0", fontSize: "1.18rem" }}>标签摘要</h2>
      <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
        {items.length ? (
          items.map((item) => (
            <div
              key={item.tag}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                padding: "12px 14px",
                borderRadius: 18,
                background: "rgba(255,255,255,0.72)",
                border: "1px solid var(--border)",
              }}
            >
              <span className="ui-sans" style={{ fontWeight: 700, color: "var(--data-indigo)" }}>#{item.tag}</span>
              <span className="ui-sans metric-value" style={{ color: "var(--muted)", fontWeight: 600 }}>{item.count} 条</span>
            </div>
          ))
        ) : (
          <p style={{ margin: 0, color: "var(--muted-strong)", lineHeight: 1.7 }}>当前范围内还没有可统计的标签。</p>
        )}
      </div>
    </section>
  );
}
