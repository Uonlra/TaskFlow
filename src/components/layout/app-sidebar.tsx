"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ROUTES } from "@/lib/constants/routes";

const navItems = [
  { label: "总览", description: "进度与预警", href: ROUTES.dashboard, icon: "overview" },
  { label: "任务", description: "筛选与推进", href: ROUTES.tasks, icon: "tasks" },
  { label: "设置", description: "账号偏好", href: ROUTES.settings, icon: "settings" },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="dashboard-sidebar"
      aria-label="主导航"
    >
      <div className="dashboard-sidebar-head">
        <p className="dashboard-brand">
          U's Task
        </p>
        <h1 className="dashboard-sidebar-title">
          工作模式
        </h1>
        <p className="dashboard-sidebar-subtitle">
          在总览、任务和设置之间快速切换。
        </p>
      </div>

      <nav className="dashboard-sidebar-nav">
        {navItems.map((item) => {
          const isActive =
            item.href === ROUTES.tasks
              ? pathname.startsWith(ROUTES.tasks)
              : pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={isActive ? "dashboard-sidebar-link dashboard-sidebar-link--active" : "dashboard-sidebar-link"}
            >
              <span className={`dashboard-sidebar-link__icon dashboard-sidebar-link__icon--${item.icon}`} aria-hidden="true">
                <span />
              </span>
              <span className="dashboard-sidebar-link__copy">
                <span className="dashboard-sidebar-link__label">{item.label}</span>
                <span className="dashboard-sidebar-link__description">{item.description}</span>
              </span>
            </Link>
          );
        })}
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
