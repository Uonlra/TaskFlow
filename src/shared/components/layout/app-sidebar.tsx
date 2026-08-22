"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { AppTopbar } from "@/shared/components/layout/app-topbar";
import { BrandMark } from "@/shared/components/layout/brand-mark";
import { NavigationIcon } from "@/shared/components/layout/navigation-icon";
import { appNavigation, appSettingsNavigation, isAppNavigationActive } from "@/shared/lib/constants/navigation";
import { SidebarTaskPulse } from "@/shared/components/layout/sidebar-task-pulse";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

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
            <div className="dashboard-brand-lockup">
              <BrandMark className="dashboard-brand-mark" />
              <span className="dashboard-brand-copy">
                <span className="dashboard-brand">U&apos;s Task</span>
                <span className="dashboard-brand-tagline">Personal workspace</span>
              </span>
            </div>
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
              >
                <NavigationIcon name={item.icon} />
              </span>
              <span className="dashboard-sidebar-link__copy">
                <span className="dashboard-sidebar-link__label">{item.label}</span>
              </span>
            </Link>
          );
        })}
      </nav>

      <SidebarTaskPulse />

      <div className="dashboard-sidebar-footer" role="group" aria-label="账户与偏好">
        <Link
          href={appSettingsNavigation.href}
          title={appSettingsNavigation.label}
          aria-current={isAppNavigationActive(pathname, appSettingsNavigation.href) ? "page" : undefined}
          className={
            isAppNavigationActive(pathname, appSettingsNavigation.href)
              ? "dashboard-sidebar-link dashboard-sidebar-link--active dashboard-sidebar-settings"
              : "dashboard-sidebar-link dashboard-sidebar-settings"
          }
        >
          <span
            className={`dashboard-sidebar-link__icon dashboard-sidebar-link__icon--${appSettingsNavigation.icon}`}
          >
            <NavigationIcon name={appSettingsNavigation.icon} />
          </span>
          <span className="dashboard-sidebar-link__copy">
            <span className="dashboard-sidebar-link__label">{appSettingsNavigation.label}</span>
          </span>
        </Link>

        <div className="dashboard-sidebar-footer-row">
          <button
            type="button"
            className="dashboard-sidebar-collapse"
            aria-label={collapsed ? "展开侧边栏" : "收起侧边栏"}
            title={collapsed ? "展开侧边栏" : "收起侧边栏"}
            aria-expanded={!collapsed}
            onClick={onToggle}
          >
            {collapsed ? (
              <PanelLeftOpen className="dashboard-sidebar-collapse__icon" aria-hidden="true" size={18} strokeWidth={1.8} />
            ) : (
              <PanelLeftClose className="dashboard-sidebar-collapse__icon" aria-hidden="true" size={18} strokeWidth={1.8} />
            )}
          </button>
          <AppTopbar variant="sidebar" />
        </div>
      </div>
    </aside>
  );
}
