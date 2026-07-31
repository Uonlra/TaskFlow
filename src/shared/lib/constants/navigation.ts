import { ROUTES } from "@/shared/lib/constants/routes";

export const appNavigation = [
  { label: "总览", description: "今天先看这里", href: ROUTES.dashboard, icon: "overview" },
  { label: "任务", description: "记录与整理", href: ROUTES.tasks, icon: "tasks" },
  { label: "日历", description: "日期与截止", href: ROUTES.calendar, icon: "calendar" },
  { label: "统计", description: "趋势与风险", href: ROUTES.stats, icon: "stats" },
  { label: "设置", description: "个人信息", href: ROUTES.settings, icon: "settings" },
] as const;
