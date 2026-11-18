// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { ApiRequestError } from "@/shared/lib/api/client";
const mocks = vi.hoisted(() => ({ load: vi.fn(), push: vi.fn(), user: { id: "account" } as { id: string } | null }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("@/features/auth/providers/auth-provider", () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock("../utils/load-related-task", () => ({ loadRelatedTask: mocks.load }));
import { TaskRelationLink } from "./task-relation-link";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.user = { id: "account" };
});
const link = (
  <TaskRelationLink taskId="source" href="/tasks/source?event=transfer&branch=a">
    来源任务
  </TaskRelationLink>
);
it("checks only on activation and preserves the exact return node", async () => {
  mocks.load.mockResolvedValue({ id: "source" });
  render(link);
  expect(mocks.load).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole("link"));
  expect(mocks.push).toHaveBeenCalledWith("/tasks/source?event=transfer&branch=a");
});
it.each([
  [null, "未找到关联任务"],
  [new ApiRequestError("denied", 403), "暂无访问权限"],
  [new ApiRequestError("expired", 401), "登录后可查看"],
  [new TypeError("offline"), "暂时无法读取"],
])("keeps the relationship when its target is unavailable", async (result, text) => {
  if (result instanceof Error) mocks.load.mockRejectedValue(result);
  else mocks.load.mockResolvedValue(result);
  render(link);
  await userEvent.click(screen.getByRole("link"));
  expect(await screen.findByRole("status")).toHaveTextContent(text as string);
  expect(mocks.push).not.toHaveBeenCalled();
  expect(screen.getByRole("link")).toHaveTextContent("来源任务");
  mocks.load.mockResolvedValue({ id: "source" });
  await userEvent.click(screen.getByRole("button", { name: "重试" }));
  expect(mocks.push).toHaveBeenCalledOnce();
});
it("does not navigate to a late response after switching accounts", async () => {
  let finish!: (value: unknown) => void;
  mocks.load.mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  const { rerender } = render(link);
  await userEvent.click(screen.getByRole("link"));
  mocks.user = { id: "other" };
  rerender(
    <TaskRelationLink taskId="source" href="/tasks/source?event=transfer&branch=a">
      来源任务
    </TaskRelationLink>,
  );
  await act(async () => finish({ id: "source" }));
  expect(mocks.push).not.toHaveBeenCalled();
});
