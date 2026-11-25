"use client";

import Link from "next/link";
import { useDesktopRuntime } from "@/shared/hooks/use-desktop-runtime";
import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { useTaskStore } from "@/features/tasks/store/task-store";
import { getDesktopBridge } from "@/shared/lib/desktop/bridge";
import { DesktopSyncButton } from "@/features/tasks/components/desktop-sync-button";

export function DesktopWorkspacePanel() {
  const isDesktop = useDesktopRuntime();
  const { user, session, profile } = useAuth();
  const syncTasks = useTaskStore((state) => state.syncTasks);
  const cloudBusy = useTaskStore((state) => state.isCloudSyncing);
  const [workspace, setWorkspace] = useState<{ accountId: string; syncEnabled: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getDesktopBridge()
      ?.workspace.get()
      .then(setWorkspace)
      .catch(() => setError("无法读取本地工作区。"));
  }, [user]);

  const bridge = isDesktop ? getDesktopBridge() : null;
  if (!bridge) return null;
  const connected = Boolean(user && workspace?.syncEnabled && workspace.accountId === user.id);
  const switchingAccount = Boolean(
    user && workspace && workspace.accountId !== "local:device" && workspace.accountId !== user.id,
  );

  const toggleSync = async () => {
    setBusy(true);
    setError(null);
    try {
      if (!connected && (!user || !profile)) throw new Error("请先登录云端账户。");
      if (!connected) await bridge.auth.set({ user, session, profile });
      const next = connected ? await bridge.workspace.pause() : await bridge.workspace.connect();
      setWorkspace(next);
      await syncTasks(user?.id);
    } catch (error) {
      setError(error instanceof Error ? error.message : "无法更新同步设置。");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="settings-profile-panel" aria-label="本地存储与云同步" data-auth-gate-bypass>
      <h2>本地存储与云同步</h2>
      <p>任务自动加密保存在此设备，关闭应用、断网或退出登录后仍可使用。</p>
      <p>{connected ? "已连接云端，点击“立即同步”更新。" : "当前仅保存在本地，云端未连接。"}</p>
      {switchingAccount ? (
        <p>切换后使用当前账户的工作区；原账户的任务仍保存在此设备，连接原账户后可重新打开。</p>
      ) : !connected ? (
        <p>连接后，本地任务归入当前账户，点击“立即同步”才会上传或下载。</p>
      ) : null}
      {user ? (
        <button type="button" onClick={() => void toggleSync()} disabled={busy || cloudBusy || !workspace}>
          {busy ? "正在处理…" : connected ? "断开云端连接" : switchingAccount ? "切换并连接当前账户" : "连接云端账户"}
        </button>
      ) : (
        <Link href="/login?next=%2Fsettings">登录云端账户（可选）</Link>
      )}
      {connected ? <DesktopSyncButton /> : null}
      <p>
        <Link href="/tasks">前往任务页导入或导出本地备份</Link>
      </p>
      {error ? <p role="alert">{error}</p> : null}
    </section>
  );
}
