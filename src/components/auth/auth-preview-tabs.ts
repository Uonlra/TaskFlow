export type AuthPreviewTab = "workspace" | "tasks" | "calendar" | "analytics";

export const authPreviewTabs: Array<{ value: AuthPreviewTab; label: string }> = [
  { value: "workspace", label: "今日总览" },
  { value: "tasks", label: "任务" },
  { value: "calendar", label: "日期安排" },
  { value: "analytics", label: "简单统计" },
];
