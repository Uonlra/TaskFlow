import Link from "next/link";

export default function MarketingPage() {
  return (
    <main
      style={{
        display: "grid",
        placeItems: "center",
        minHeight: "100vh",
        padding: "32px",
      }}
    >
      <section
        className="card-surface"
        style={{
          width: "min(920px, 100%)",
          borderRadius: "32px",
          padding: "48px",
        }}
      >
        <p style={{ color: "var(--primary)", fontWeight: 700, letterSpacing: "0.08em" }}>
          U's Task - 个人任务管理工具
        </p>
        <h1 style={{ fontSize: "clamp(2.8rem, 7vw, 5rem)", lineHeight: 1, margin: "12px 0 16px" }}>
          把一天的工作
          <br />
          梳理得清楚一点。
        </h1>
        <p style={{ maxWidth: 620, color: "var(--muted)", fontSize: "1.1rem", lineHeight: 1.7 }}>
          专属于个人的任务工作台，帮助你安排轻重缓急、推进进度，并在纷杂事项中保持秩序。
        </p>
        <div style={{ display: "flex", gap: 16, marginTop: 28, flexWrap: "wrap" }}>
          <Link
            href="/dashboard"
            style={{
              padding: "14px 20px",
              borderRadius: 999,
              background: "var(--primary)",
              color: "var(--primary-foreground)",
              fontWeight: 700,
            }}
          >
            开始制定任务
          </Link>
          <Link
            href="/tasks"
            style={{
              padding: "14px 20px",
              borderRadius: 999,
              border: "1px solid var(--border)",
              fontWeight: 700,
            }}
          >
            浏览任务页
          </Link>
        </div>
      </section>
    </main>
  );
}
