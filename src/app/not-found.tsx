import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
    >
      <section
        className="card-surface"
        style={{
          width: "min(560px, 100%)",
          borderRadius: 28,
          padding: 32,
          textAlign: "center",
        }}
      >
        <p style={{ margin: 0, color: "var(--primary)", fontWeight: 700, letterSpacing: "0.08em" }}>未找到页面</p>
        <h1 style={{ margin: "12px 0 0", fontSize: "2rem" }}>这个页面暂时不存在</h1>
        <p style={{ margin: "14px 0 0", color: "var(--muted)", lineHeight: 1.7 }}>
          你打开的路径目前还没有内容，可以先回到总览继续整理任务。
        </p>
        <Link
          href="/dashboard"
          style={{
            display: "inline-flex",
            marginTop: 24,
            padding: "14px 18px",
            borderRadius: 999,
            background: "var(--primary)",
            color: "var(--primary-foreground)",
            fontWeight: 700,
          }}
        >
          回到总览
        </Link>
      </section>
    </main>
  );
}
