"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { AppTopbar } from "@/shared/components/layout/app-topbar";
import { appNavigation, isAppNavigationActive } from "@/shared/lib/constants/navigation";

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="dashboard-sidebar" aria-label="主导航">
      <div className="dashboard-sidebar-head">
        <div className="dashboard-sidebar-title-row">
          <div className="dashboard-sidebar-title-copy">
            <p className="dashboard-brand">U&apos;s Task</p>
            <h1 className="dashboard-sidebar-title">我的任务本</h1>
          </div>
          <AppTopbar variant="mobile" />
        </div>
        <p className="dashboard-sidebar-subtitle">把要做的事放在一个简单、顺手的地方。</p>
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
                <span className="dashboard-sidebar-link__description">{item.description}</span>
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="dashboard-sidebar-note">
        <p className="dashboard-sidebar-note__label">给自己的提醒</p>
        <p className="dashboard-sidebar-note__title">先收住正在做的事。</p>
        <p className="dashboard-sidebar-note__body">少开几个分支，手上的事会更容易做完。</p>
      </div>
    </aside>
  );
}
