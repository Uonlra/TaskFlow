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
      <h2 style={{ margin: 0, fontSize: "1.1rem" }}>最近活动</h2>
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
                <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>{item.timestampLabel}</span>
              </div>
              <p style={{ margin: "8px 0 0", color: "var(--muted)", lineHeight: 1.6 }}>{item.summary}</p>
            </article>
          ))
        ) : (
          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.7 }}>
            当任务开始创建、更新或完成后，这里会逐步出现最近活动记录。
          </p>
        )}
      </div>
    </section>
  );
}
