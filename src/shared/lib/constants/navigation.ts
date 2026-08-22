import { ROUTES } from "@/shared/lib/constants/routes";

export const appNavigation = [
  { label: "总览", href: ROUTES.dashboard, icon: "overview" },
  { label: "任务", href: ROUTES.tasks, icon: "tasks" },
  { label: "日历", href: ROUTES.calendar, icon: "calendar" },
  { label: "统计", href: ROUTES.stats, icon: "stats" },
] as const;

export const appSettingsNavigation = { label: "设置", href: ROUTES.settings, icon: "settings" } as const;

export const appMobileNavigation = [...appNavigation, appSettingsNavigation] as const;

export function isAppNavigationActive(pathname: string, href: string) {
  if (href === ROUTES.dashboard) {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
