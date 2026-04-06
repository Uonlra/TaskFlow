import Link from "next/link";
import { ROUTES } from "@/lib/constants/routes";

const navItems = [
  { label: "仪表盘", href: ROUTES.dashboard },
  { label: "任务列表", href: ROUTES.tasks },
  { label: "设置", href: ROUTES.settings },
];

export function AppSidebar() {
  return (
    <aside
      className="card-surface"
      style={{
        borderRadius: 34,
        padding: 26,
        position: "sticky",
        top: 20,
        height: "calc(100vh - 40px)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div>
        <p style={{ margin: 0, color: "var(--primary)", fontWeight: 700, letterSpacing: "0.12em", fontSize: "0.92rem" }}>
          清衡任务台
        </p>
        <h1 style={{ margin: "18px 0 0", fontSize: "2rem", lineHeight: 1.28 }}>
          让每天的推进
          <br />
          更安静一些。
        </h1>
      </div>

      <nav style={{ display: "grid", gap: 12, marginTop: 36 }}>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            style={{
              padding: "15px 18px",
              borderRadius: 20,
              border: "1px solid var(--border)",
              background: "rgba(255,255,255,0.62)",
              fontWeight: 600,
            }}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div
        style={{
          marginTop: "auto",
          padding: 20,
          borderRadius: 26,
          background: "linear-gradient(135deg, rgba(199,91,57,0.12), rgba(236,220,197,0.8))",
          border: "1px solid rgba(199,91,57,0.2)",
        }}
      >
        <p style={{ margin: 0, fontWeight: 700, fontSize: "1rem" }}>本周提醒</p>
        <p style={{ margin: "10px 0 0", color: "var(--muted)", lineHeight: 1.8 }}>
          先把进行中的任务收口，再继续新增事项，能明显减少上下文切换。
        </p>
      </div>
    </aside>
  );
}
