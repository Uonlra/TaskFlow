"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useDesktopRuntime } from "@/shared/hooks/use-desktop-runtime";
import { getDesktopBridge } from "@/shared/lib/desktop/bridge";
import { useTaskStore } from "@/features/tasks/store/task-store";
import "@/styles/desktop-controls.css";

export function DesktopChrome() {
  const desktop = useDesktopRuntime();
  const router = useRouter();
  const menuRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const bridge = getDesktopBridge();
    if (!bridge?.shell || bridge.shell.quickWindow) return;
    const root = document.documentElement;
    if (bridge.platform === "win32") root.dataset.desktopChrome = "true";
    const theme = () => void bridge.shell!.theme(root.dataset.theme === "dark").catch(() => undefined);
    theme();
    const observer = new MutationObserver(theme);
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    const offSettings = bridge.shell.onSettings(() => router.push("/settings"));
    let version = 0;
    const offTasks = bridge.shell.onTasksChanged(async ({ accountId }) => {
      const request = ++version;
      const tasks = await bridge.localTasks.list({ accountId }).catch(() => null);
      if (tasks && request === version && (await bridge.workspace.get()).accountId === accountId)
        useTaskStore.setState({ tasks });
    });
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "F10" && !event.shiftKey) {
        event.preventDefault();
        menuRef.current?.focus();
        void bridge.shell!.menu();
      }
    };
    window.addEventListener("keydown", keyboard);
    return () => {
      version++;
      observer.disconnect();
      offSettings();
      offTasks();
      window.removeEventListener("keydown", keyboard);
      delete root.dataset.desktopChrome;
    };
  }, [router]);
  if (!desktop || getDesktopBridge()?.platform !== "win32" || getDesktopBridge()?.shell?.quickWindow) return null;
  return (
    <header className="desktop-titlebar" aria-label="应用标题栏">
      <button
        ref={menuRef}
        type="button"
        aria-label="应用菜单（F10）"
        aria-haspopup="menu"
        onClick={() => void getDesktopBridge()?.shell?.menu()}
      >
        ☰
      </button>
      <span>U&apos;s Task</span>
      <span className="desktop-titlebar-caption">个人工作台</span>
      <button
        className="desktop-titlebar-capture"
        type="button"
        onClick={() => void getDesktopBridge()?.quickCapture?.show()}
      >
        ＋ 快速记录
      </button>
    </header>
  );
}
