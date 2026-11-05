"use client";
import { useEffect, useState } from "react";
import { useDesktopRuntime } from "@/shared/hooks/use-desktop-runtime";
import { getDesktopBridge, type DesktopUpdateState } from "@/shared/lib/desktop/bridge";

export function DesktopUpdatesPanel() {
  const isDesktop = useDesktopRuntime();
  const [state, setState] = useState<DesktopUpdateState | null>(null);
  const [error, setError] = useState("");
  const [confirmInstall, setConfirmInstall] = useState(false);
  useEffect(() => {
    const updates = getDesktopBridge()?.updates;
    if (!updates) return;
    let active = true;
    let received = false;
    const unsubscribe = updates.subscribe((next) => {
      received = true;
      if (active) setState(next);
    });
    void updates
      .getState()
      .then((next) => {
        if (active && !received) setState(next);
      })
      .catch(() => {
        if (active) setError("无法读取更新状态，请重新打开应用。");
      });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);
  if (!isDesktop) return null;
  const updates = getDesktopBridge()?.updates;
  const run = async (action: "check" | "download" | "install") => {
    setError("");
    try {
      if (!updates) throw new Error("更新服务不可用");
      await updates[action]();
    } catch {
      setError("无法操作更新，请重新打开应用或稍后重试。");
    }
  };
  const canCheck = state && ["idle", "checking", "available", "not-available", "error"].includes(state.phase);
  return (
    <section className="settings-profile-panel" aria-label="应用更新" data-auth-gate-bypass>
      <h2>应用更新</h2>
      {state ? (
        <p>
          当前版本 {state.currentVersion} · {state.channel === "beta" ? "beta 测试通道" : "正式版通道"}
        </p>
      ) : (
        <p>正在读取版本信息…</p>
      )}
      <p>自动检查更新；下载和重启安装均由你确认，退出应用不会自动安装。</p>
      <p role="status">{state?.message}</p>
      {state?.version ? <p>新版本 {state.version}</p> : null}
      {state?.phase === "downloading" ? (
        <div>
          <progress aria-label="更新下载进度" value={state.percent} max={100} />
          <span>{Math.round(state.percent)}%</span>
        </div>
      ) : null}
      {canCheck ? (
        <button type="button" disabled={state.phase === "checking"} onClick={() => void run("check")}>
          {state.phase === "checking" ? "正在检查…" : "检查更新"}
        </button>
      ) : null}
      {state?.phase === "available" ? (
        <button type="button" onClick={() => void run("download")}>
          下载更新
        </button>
      ) : null}
      {state?.phase === "downloaded" ? (
        <button type="button" onClick={() => setConfirmInstall(true)}>
          重启并安装
        </button>
      ) : null}
      {confirmInstall && state?.phase === "downloaded" ? (
        <div role="alertdialog" aria-labelledby="confirm-update-title">
          <h3 id="confirm-update-title">重启应用并安装更新？</h3>
          <p>请先保存正在编辑的内容。已保存在此设备的任务会保留。</p>
          <button
            type="button"
            onClick={() => {
              setConfirmInstall(false);
              void run("install");
            }}
          >
            确认重启安装
          </button>
          <button type="button" onClick={() => setConfirmInstall(false)}>
            暂不重启
          </button>
        </div>
      ) : null}
      {error ? <p role="alert">{error}</p> : null}
      <p>
        <a href="https://github.com/Uonlra/TaskFlow/releases" target="_blank" rel="noreferrer">
          查看版本说明
        </a>
      </p>
    </section>
  );
}
