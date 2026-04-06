type TagSummaryProps = {
  items: Array<{ tag: string; count: number }>;
};

export function TagSummary({ items }: TagSummaryProps) {
  return (
    <section className="card-surface" style={{ borderRadius: 28, padding: 24 }}>
      <h2 style={{ margin: 0, fontSize: "1.1rem" }}>标签摘要</h2>
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
              <span style={{ fontWeight: 700, color: "var(--success)" }}>#{item.tag}</span>
              <span style={{ color: "var(--muted)", fontWeight: 600 }}>{item.count} 条</span>
            </div>
          ))
        ) : (
          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.7 }}>当前范围内还没有可统计的标签。</p>
        )}
      </div>
    </section>
  );
}
