"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { appMobileNavigation, isAppNavigationActive } from "@/shared/lib/constants/navigation";

export function MobileBottomNavigation() {
  const pathname = usePathname();

  return (
    <nav className="mobile-bottom-navigation" aria-label="移动导航">
      {appMobileNavigation.map((item) => {
        const isActive = isAppNavigationActive(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={isActive ? "mobile-bottom-navigation__item is-active" : "mobile-bottom-navigation__item"}
          >
            <span className="mobile-bottom-navigation__icon" aria-hidden="true">
              <span className={`dashboard-sidebar-link__icon dashboard-sidebar-link__icon--${item.icon}`}>
                <span />
              </span>
            </span>
            <span className="mobile-bottom-navigation__label">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
