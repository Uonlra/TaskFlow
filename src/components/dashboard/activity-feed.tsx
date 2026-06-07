type ActivityItem = {
  id: string;
  title: string;
  summary: string;
  timestampLabel: string;
  tone: "success" | "info" | "warning";
};

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <section className="card-surface" style={{ borderRadius: 28, padding: 24 }}>
      <p className="section-eyebrow" style={{ margin: 0, color: "var(--primary)", fontWeight: 700, fontSize: "0.82rem" }}>
        轨迹
      </p>
      <h2 style={{ margin: "10px 0 0", fontSize: "1.18rem" }}>最近动静</h2>
      <div style={{ marginTop: 18, display: "grid", gap: 14 }}>
        {items.length ? (
          items.map((item) => (
            <article
              key={item.id}
              style={{
                padding: 16,
                borderRadius: 20,
                background: "rgba(255,255,255,0.72)",
                border: "1px solid var(--border)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
                <p
                  className="ui-sans"
                  style={{
                    margin: 0,
                    fontWeight: 700,
                    color:
                      item.tone === "success"
                        ? "var(--success)"
                        : item.tone === "warning"
                          ? "var(--warning)"
                          : "var(--primary)",
                  }}
                >
                  {item.title}
                </p>
                <span className="ui-sans" style={{ color: "var(--muted)", fontSize: "0.82rem" }}>{item.timestampLabel}</span>
              </div>
              <p style={{ margin: "8px 0 0", color: "var(--muted-strong)", lineHeight: 1.7 }}>{item.summary}</p>
            </article>
          ))
        ) : (
          <p style={{ margin: 0, color: "var(--muted-strong)", lineHeight: 1.7 }}>
            任务创建、更新或完成后，这里会留下脚印。目前还很干净。
          </p>
        )}
      </div>
    </section>
  );
}
