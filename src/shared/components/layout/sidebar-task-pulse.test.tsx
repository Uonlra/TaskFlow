// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

const mocks = vi.hoisted(() => ({
  taskState: {
    tasks: [],
    isLoading: false,
    lastLoadedUserId: null as string | null,
    syncTasks: vi.fn(),
  },
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/features/auth/providers/auth-provider", () => ({
  useAuth: () => ({
    user: {
      id: "user-1",
    },
    isLoading: false,
    isConfigured: true,
  }),
}));

vi.mock("@/features/tasks/store/task-store", () => ({
  useTaskStore: (selector: (state: typeof mocks.taskState) => unknown) => selector(mocks.taskState),
}));

vi.mock("@/shared/components/charts/echarts-client", () => ({
  EChartsClient: ({ ariaLabel }: { ariaLabel: string }) => <div aria-label={ariaLabel} />,
}));

import { SidebarTaskPulse } from "@/shared/components/layout/sidebar-task-pulse";

afterEach(() => {
  mocks.taskState.syncTasks.mockReset();
  mocks.taskState.tasks = [];
  mocks.taskState.isLoading = false;
  mocks.taskState.lastLoadedUserId = null;
});

describe("SidebarTaskPulse", () => {
  it("不会为侧栏趋势额外拉取全部云端任务", () => {
    render(<SidebarTaskPulse />);

    expect(mocks.taskState.syncTasks).not.toHaveBeenCalled();

    expect(screen.getByText("--", { selector: "strong" })).toBeVisible();
    expect(screen.getByText("前往统计查看趋势")).toBeVisible();
  });
});
