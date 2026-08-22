import { CalendarDays, ChartNoAxesCombined, LayoutDashboard, ListTodo, Settings, type LucideIcon } from "lucide-react";

export type NavigationIconName = "overview" | "tasks" | "calendar" | "stats" | "settings";

const navigationIcons: Record<NavigationIconName, LucideIcon> = {
  overview: LayoutDashboard,
  tasks: ListTodo,
  calendar: CalendarDays,
  stats: ChartNoAxesCombined,
  settings: Settings,
};

export function NavigationIcon({ name }: { name: NavigationIconName }) {
  const Icon = navigationIcons[name];

  return <Icon aria-hidden="true" size={18} strokeWidth={1.8} />;
}
