"use client";
import { useEffect, useState } from "react";
import { getDesktopBridge, type DesktopShortcutState } from "@/shared/lib/desktop/bridge";
import { useDesktopRuntime } from "@/shared/hooks/use-desktop-runtime";

export function DesktopShortcutsPanel() {
  const desktop = useDesktopRuntime();
  const [state, setState] = useState<DesktopShortcutState>();
  const [shortcut, setShortcut] = useState("Ctrl+Alt+N");
  const [enabled, setEnabled] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    let active = true;
    void getDesktopBridge()
      ?.shortcuts?.get()
      .then((value) => {
        if (active) {
          setState(value);
          setShortcut(value.shortcut);
          setEnabled(value.enabled);
        }
      })
      .catch(() => {
        if (active) setError("无法读取快捷键设置。");
      });
    return () => {
      active = false;
    };
  }, []);
  if (!desktop || !getDesktopBridge()?.shortcuts) return null;
  return (
    <section className="settings-profile-panel desktop-shortcuts" aria-label="快速记录快捷键" data-auth-gate-bypass>
      <h2>快速记录</h2>
      <p>应用运行时，即使正在使用其他软件，也能唤起独立记录窗口。</p>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setSaving(true);
          setError("");
          try {
            const next = await getDesktopBridge()!.shortcuts!.set({ shortcut, enabled });
            setState(next);
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : "无法保存快捷键设置。");
          } finally {
            setSaving(false);
          }
        }}
      >
        <label>
          <input
            type="checkbox"
            checked={enabled}
            disabled={saving}
            onChange={(event) => setEnabled(event.target.checked)}
          />
          启用全局快捷键
        </label>
        <label>
          快捷键
          <input
            type="text"
            value={shortcut}
            disabled={saving}
            onChange={(event) => setShortcut(event.target.value)}
            aria-describedby="shortcut-help"
          />
        </label>
        <p id="shortcut-help">使用 Ctrl 或 Alt 搭配字母或数字，例如 Ctrl+Alt+N。关闭后仍可从应用菜单或托盘打开。</p>
        <button type="submit" disabled={saving || !state}>
          {saving ? "保存中…" : "保存快捷键"}
        </button>
        <p role="status">
          {state?.message}
          {state?.registered ? ` · 当前快捷键：${state.shortcut}` : ""}
        </p>
        {error && <p role="alert">{error}</p>}
      </form>
    </section>
  );
}
