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
      className="dashboard-sidebar"
      aria-label="主导航"
    >
      <div>
        <p className="dashboard-brand">
          U's Task
        </p>
        <h1 className="dashboard-sidebar-title">
          让今天的推进
          <br />
          更轻、更清楚。
        </h1>
      </div>

      <nav className="dashboard-sidebar-nav">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="dashboard-sidebar-link"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="dashboard-sidebar-note">
        <p className="dashboard-sidebar-note__label">
          本周提醒
        </p>
        <p className="dashboard-sidebar-note__title">先把进行中的事情收住。</p>
        <p className="dashboard-sidebar-note__body">
          先将进行中的任务完成，再继续新增事项，能明显减少上下文切换。
        </p>
      </div>
    </aside>
  );
}
