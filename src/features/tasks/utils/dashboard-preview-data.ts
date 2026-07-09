import type { Task, TaskPriority, TaskStatus } from "@/features/tasks/types/task.types";

type PreviewTaskInput = {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  tags: string[];
  createdOffset: number;
  dueOffset?: number;
  completedOffset?: number;
};

const previewTaskInputs: PreviewTaskInput[] = [
  {
    title: "产品需求评审",
    description: "确认本周任务看板的核心指标。",
    status: "in_progress",
    priority: "high",
    tags: ["产品", "会议"],
    createdOffset: -1,
    dueOffset: 0,
  },
  {
    title: "设计稿交付",
    description: "整理移动端任务列表与设置页状态。",
    status: "todo",
    priority: "high",
    tags: ["设计", "项目A"],
    createdOffset: -2,
    dueOffset: 1,
  },
  {
    title: "用户调研分析",
    description: "汇总访谈记录和痛点标签。",
    status: "todo",
    priority: "medium",
    tags: ["研究", "产品"],
    createdOffset: -3,
    dueOffset: 3,
  },
  {
    title: "版本发布准备",
    description: "检查发布清单和验收项。",
    status: "in_progress",
    priority: "high",
    tags: ["发布", "工程"],
    createdOffset: -4,
    dueOffset: -1,
  },
  {
    title: "数据报表优化",
    description: "补充统计页趋势和分布指标。",
    status: "todo",
    priority: "medium",
    tags: ["数据", "工程"],
    createdOffset: -5,
    dueOffset: 2,
  },
  {
    title: "竞品分析报告",
    description: "整理效率工具的信息架构差异。",
    status: "done",
    priority: "medium",
    tags: ["研究", "报告"],
    createdOffset: -6,
    dueOffset: -2,
    completedOffset: -1,
  },
  {
    title: "日历同步方案",
    description: "定义日程入口和 URL 参数协议。",
    status: "todo",
    priority: "low",
    tags: ["日历", "工程"],
    createdOffset: -1,
    dueOffset: 4,
  },
  {
    title: "任务筛选协议",
    description: "验证优先级和截止日期筛选入口。",
    status: "done",
    priority: "high",
    tags: ["工程", "任务"],
    createdOffset: -7,
    dueOffset: -3,
    completedOffset: -3,
  },
  {
    title: "首页空状态文案",
    description: "压缩空状态说明并保留操作入口。",
    status: "in_progress",
    priority: "medium",
    tags: ["文案", "设计"],
    createdOffset: 0,
    dueOffset: 0,
  },
  {
    title: "统计卡片校准",
    description: "调整卡片高度、边框和视觉密度。",
    status: "done",
    priority: "low",
    tags: ["设计", "数据"],
    createdOffset: -2,
    dueOffset: -1,
    completedOffset: 0,
  },
  {
    title: "设置页检查",
    description: "确认移动端设置入口没有被影响。",
    status: "todo",
    priority: "low",
    tags: ["移动端", "设置"],
    createdOffset: -3,
    dueOffset: 5,
  },
  {
    title: "平板布局复核",
    description: "检查 1024 宽度下卡片和右栏排布。",
    status: "todo",
    priority: "medium",
    tags: ["设计", "测试"],
    createdOffset: -2,
    dueOffset: 2,
  },
  {
    title: "登录流程回归",
    description: "确认认证状态下 dashboard 正常加载。",
    status: "done",
    priority: "low",
    tags: ["测试", "认证"],
    createdOffset: -5,
    completedOffset: -4,
  },
  {
    title: "标签 Top N 规则",
    description: "确认标签计数和排序逻辑。",
    status: "done",
    priority: "medium",
    tags: ["数据", "任务"],
    createdOffset: -6,
    completedOffset: -5,
  },
];

export function buildDashboardPreviewTasks(referenceDate = new Date()): Task[] {
  return previewTaskInputs.map((task, index) => {
    const createdAt = dateWithOffset(referenceDate, task.createdOffset);
    const completedAt =
      typeof task.completedOffset === "number" ? dateWithOffset(referenceDate, task.completedOffset, 17) : undefined;
    const updatedAt = completedAt ?? dateWithOffset(referenceDate, Math.min(0, task.createdOffset + 1), 14);

    return {
      id: `dashboard-preview-${index + 1}`,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      tags: task.tags,
      dueDate: typeof task.dueOffset === "number" ? dateWithOffset(referenceDate, task.dueOffset, 18) : undefined,
      createdAt,
      updatedAt,
      completedAt,
    };
  });
}

function dateWithOffset(referenceDate: Date, offset: number, hour = 9) {
  const value = new Date(referenceDate);
  value.setDate(value.getDate() + offset);
  value.setHours(hour, 0, 0, 0);
  return value.toISOString();
}
