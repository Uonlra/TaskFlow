// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { DesktopUpdateState, TaskflowDesktopBridge } from "@/shared/lib/desktop/bridge";
import { DesktopUpdatesPanel } from "./desktop-updates-panel";

afterEach(() => {
  delete window.taskflowDesktop;
});
it("普通网页不显示桌面更新入口", () => {
  render(<DesktopUpdatesPanel />);
  expect(screen.queryByRole("region", { name: "应用更新" })).toBeNull();
});
it("显示下载状态，重启必须二次确认，卸载组件会移除订阅", async () => {
  const initial: DesktopUpdateState = {
    phase: "idle",
    currentVersion: "2.2.0-beta.1",
    channel: "beta",
    version: null,
    percent: 0,
    message: "",
  };
  let publish: (state: DesktopUpdateState) => void = () => {};
  const unsubscribe = vi.fn();
  const install = vi.fn().mockResolvedValue(undefined);
  window.taskflowDesktop = {
    isDesktop: true,
    updates: {
      getState: vi.fn().mockResolvedValue(initial),
      subscribe: (listener: (state: DesktopUpdateState) => void) => {
        publish = listener;
        return unsubscribe;
      },
      check: vi.fn(async () => {
        publish({ ...initial, phase: "available", version: "2.2.0-beta.2" });
        return initial;
      }),
      download: vi.fn(async () => {
        publish({ ...initial, phase: "downloaded", version: "2.2.0-beta.2", percent: 100 });
        return initial;
      }),
      install,
    },
  } as unknown as TaskflowDesktopBridge;
  const { unmount } = render(<DesktopUpdatesPanel />);
  fireEvent.click(await screen.findByRole("button", { name: "检查更新" }));
  fireEvent.click(await screen.findByRole("button", { name: "下载更新" }));
  fireEvent.click(await screen.findByRole("button", { name: "重启并安装" }));
  expect(install).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "暂不重启" }));
  expect(install).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "重启并安装" }));
  fireEvent.click(screen.getByRole("button", { name: "确认重启安装" }));
  await waitFor(() => expect(install).toHaveBeenCalledTimes(1));
  act(() => publish({ ...initial, phase: "downloading", percent: 50 }));
  expect(screen.getByRole("progressbar", { name: "更新下载进度" })).toHaveAttribute("value", "50");
  unmount();
  expect(unsubscribe).toHaveBeenCalledOnce();
});
