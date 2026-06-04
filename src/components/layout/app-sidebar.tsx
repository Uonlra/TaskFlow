import Link from "next/link";
import { ROUTES } from "@/lib/constants/routes";

const navItems = [
  { label: "主页面", href: ROUTES.dashboard },
  { label: "任务列表", href: ROUTES.tasks },
  { label: "设置", href: ROUTES.settings },
];

export function AppSidebar() {
  return (
    <aside
      className="dashboard-sidebar card-surface"
      aria-label="主导航"
      style={{
        borderRadius: 34,
        padding: 26,
        display: "flex",
        flexDirection: "column",
        background: "linear-gradient(180deg, rgba(255,255,255,0.92), rgba(244,248,255,0.86))",
      }}
    >
      <div>
        <p className="section-eyebrow" style={{ margin: 0, color: "var(--primary)", fontWeight: 700, fontSize: "0.84rem" }}>
          U's Task
        </p>
        <h1 style={{ margin: "18px 0 0", fontSize: "2rem", lineHeight: 1.28 }}>
          让今天的推进
          <br />
          更轻、更清楚。
        </h1>
      </div>

      <nav style={{ display: "grid", gap: 12, marginTop: 36, marginBottom: 36 }}>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="ui-sans"
            style={{
              padding: "15px 18px",
              borderRadius: 20,
              border: "1px solid var(--border)",
              background: "rgba(255,255,255,0.82)",
              fontWeight: 700,
              lineHeight: 1.55,
            }}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div
        style={{
          marginTop: "auto",
          padding: 21,
          borderRadius: 26,
          background: "linear-gradient(135deg, rgba(37,99,235,0.1), rgba(219,234,254,0.94))",
          border: "1px solid rgba(37,99,235,0.16)",
        }}
      >
        <p className="section-eyebrow" style={{ margin: 0, color: "var(--data-ink)", fontWeight: 700, fontSize: "0.8rem" }}>
          本周提醒
        </p>
        <p style={{ margin: "10px 0 0", fontWeight: 700, fontSize: "1.1rem" }}>先把进行中的事情收住。</p>
        <p style={{ margin: "10px 0 0", color: "var(--muted-strong)", lineHeight: 1.8 }}>
          先将进行中的任务完成，再继续新增事项，能明显减少上下文切换。
        </p>
      </div>
    </aside>
  );
}
