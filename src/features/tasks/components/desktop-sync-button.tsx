"use client";

import { useAuth } from "@/features/auth/providers/auth-provider";
import { useTaskStore } from "../store/task-store";
import { useToast } from "@/shared/providers/toast-provider";

export function DesktopSyncButton() {
  const { user } = useAuth();
  const syncCloudTasks = useTaskStore((state) => state.syncCloudTasks);
  const busy = useTaskStore((state) => state.isCloudSyncing);
  const { showToast } = useToast();
  if (!user) return null;

  const sync = async () => {
    try {
      await syncCloudTasks(user.id);
      showToast({ title: "手动同步完成", tone: "success" });
    } catch (error) {
      showToast({
        title: "同步未完成",
        description: error instanceof Error ? error.message : "请稍后手动重试。",
        tone: "error",
      });
    }
  };

  return (
    <button type="button" onClick={() => void sync()} disabled={busy} aria-busy={busy}>
      {busy ? "同步中…" : "立即同步"}
    </button>
  );
}
