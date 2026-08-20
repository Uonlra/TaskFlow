"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { AppTopbar } from "@/shared/components/layout/app-topbar";
import { appNavigation, isAppNavigationActive } from "@/shared/lib/constants/navigation";

type AppSidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
};

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="dashboard-sidebar" aria-label="主导航">
      <div className="dashboard-sidebar-head">
        <div className="dashboard-sidebar-title-row">
          <div className="dashboard-sidebar-title-copy">
            <p className="dashboard-brand">U&apos;s Task</p>
          </div>
          <AppTopbar variant="mobile" />
        </div>
      </div>

      <nav className="dashboard-sidebar-nav" aria-label="主导航">
        {appNavigation.map((item) => {
          const isActive = isAppNavigationActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={isActive ? "dashboard-sidebar-link dashboard-sidebar-link--active" : "dashboard-sidebar-link"}
              >
                <span
                  className={`dashboard-sidebar-link__icon dashboard-sidebar-link__icon--${item.icon}`}
                  aria-hidden="true"
                >
                  <span />
                </span>
                <span className="dashboard-sidebar-link__copy">
                  <span className="dashboard-sidebar-link__label">{item.label}</span>
                </span>
              </Link>
          );
        })}
      </nav>

      <div className="dashboard-sidebar-footer">
        <button
          type="button"
          className="dashboard-sidebar-collapse"
          aria-label={collapsed ? "展开侧边栏" : "收起侧边栏"}
          title={collapsed ? "展开侧边栏" : "收起侧边栏"}
          aria-expanded={!collapsed}
          onClick={onToggle}
        >
          <span className="dashboard-sidebar-collapse__icon" aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}
