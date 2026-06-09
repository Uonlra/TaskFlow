export type DashboardStat = {
  label: string;
  value: string;
  helper: string;
};

export const dashboardSummary: DashboardStat[] = [
  {
    label: "未完成任务",
    value: "12",
    helper: "当前列表还算可控，不过仍有几件事在争同一段注意力。",
  },
  {
    label: "进行中",
    value: "4",
    helper: "把同时推进的数量收紧，能减少上下文切换和决策疲劳。",
  },
  {
    label: "已完成",
    value: "18",
    helper: "这是这个小工具正在派上用场的安静证据。",
  },
  {
    label: "即将到期",
    value: "3",
    helper: "最好先看一眼，别让临时的紧急事项反过来支配你的安排。",
  },
];
