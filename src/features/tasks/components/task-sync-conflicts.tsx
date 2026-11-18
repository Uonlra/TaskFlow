"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { GitCompareArrows, X } from "lucide-react";
import { useTaskStore } from "../store/task-store";
import { getDesktopBridge } from "@/shared/lib/desktop/bridge";
import { useDesktopRuntime } from "@/shared/hooks/use-desktop-runtime";
import { useToast } from "@/shared/providers/toast-provider";
import type { TaskSyncConflict } from "../types/task-sync.types";
import type { Task } from "../types/task.types";
import { describeEvolutionEvent } from "../utils/task-evolution-presentation";
import { refreshTaskSyncConflict, resolveTaskSyncConflict } from "../sync/task-sync-conflicts";

export function TaskSyncConflicts() {
  const desktop = useDesktopRuntime();
  const tasks = useTaskStore((state) => state.tasks);
  const [state, setState] = useState<{ accountId: string; conflicts: TaskSyncConflict[] }>({
    accountId: "",
    conflicts: [],
  });
  const [open, setOpen] = useState(false);
  const epoch = useRef(0);
  const trigger = useRef<HTMLButtonElement>(null);
  const reload = useCallback(async () => {
    const version = ++epoch.current;
    if (!desktop) return;
    const bridge = getDesktopBridge();
    if (!bridge?.syncQueue.conflicts) return;
    const workspace = await bridge.workspace.get();
    const conflicts = await bridge.syncQueue.conflicts({ accountId: workspace.accountId });
    if (version === epoch.current) setState({ accountId: workspace.accountId, conflicts });
  }, [desktop]);
  useEffect(() => {
    void reload().catch(() => undefined);
  }, [reload, tasks]);
  useEffect(() => {
    const listener = () => {
      void reload().catch(() => undefined);
    };
    window.addEventListener("taskflow:sync-state-changed", listener);
    window.addEventListener("focus", listener);
    return () => {
      window.removeEventListener("taskflow:sync-state-changed", listener);
      window.removeEventListener("focus", listener);
    };
  }, [reload]);
  if (!desktop || !state.conflicts.length) return null;
  return (
    <div className="task-sync-notice" data-auth-gate-bypass>
      <button ref={trigger} onClick={() => setOpen(true)}>
        <GitCompareArrows size={16} aria-hidden="true" />
        同步待处理 <span>{state.conflicts.length}</span>
      </button>
      {open ? (
        <ConflictDialog
          accountId={state.accountId}
          conflicts={state.conflicts}
          reload={reload}
          onClose={() => {
            setOpen(false);
            requestAnimationFrame(() => (trigger.current ?? document.getElementById("main-content"))?.focus());
          }}
        />
      ) : null}
    </div>
  );
}

function ConflictDialog({
  accountId,
  conflicts,
  reload,
  onClose,
}: {
  accountId: string;
  conflicts: TaskSyncConflict[];
  reload: () => Promise<void>;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const [selectedId, setSelectedId] = useState(conflicts[0].taskId);
  const conflict = conflicts.find((item) => item.taskId === selectedId) ?? conflicts[0];
  const { taskId, operationId } = conflict;
  const [readVersion, setReadVersion] = useState(0);
  const readKey = JSON.stringify([accountId, taskId, operationId, readVersion]);
  const [finishedRead, setFinishedRead] = useState<string | null>(null);
  const reading = finishedRead !== readKey;
  const [saving, setSaving] = useState(false);
  const [discardKey, setDiscardKey] = useState<string | null>(null);
  const confirmDiscard = discardKey === readKey;
  const setConfirmDiscard = (value: boolean) => setDiscardKey(value ? readKey : null);
  const [error, setError] = useState<string | null>(null);
  const requestIds = useRef<{ signature: string; resolutionId: string; copyTaskId: string } | null>(null);
  const busy = useRef(false);
  const { showToast } = useToast();
  useEffect(() => {
    const node = dialog.current;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    node?.showModal();
    return () => {
      node?.close();
      document.body.style.overflow = previous;
    };
  }, []);
  useEffect(() => {
    let cancelled = false;
    void refreshTaskSyncConflict(accountId, { taskId, operationId })
      .then(reload)
      .catch((cause) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "无法读取云端版本。");
      })
      .finally(() => {
        if (!cancelled) setFinishedRead(readKey);
      });
    return () => {
      cancelled = true;
    };
    // A changed local operation must be reviewed afresh; refreshing the cloud snapshot alone must not loop.
  }, [accountId, taskId, operationId, readKey, reload]);

  async function resolve(mode: "keep_both" | "use_cloud") {
    if (busy.current || reading) return;
    busy.current = true;
    setSaving(true);
    setError(null);
    const signature = JSON.stringify([conflict.taskId, conflict.operationId, conflict.remote, mode]);
    if (requestIds.current?.signature !== signature)
      requestIds.current = { signature, resolutionId: crypto.randomUUID(), copyTaskId: crypto.randomUUID() };
    try {
      const result = await resolveTaskSyncConflict(accountId, conflict, requestIds.current, mode, confirmDiscard);
      await useTaskStore.getState().syncTasks(accountId);
      window.dispatchEvent(
        new CustomEvent("taskflow:task-sync-resolved", { detail: { taskId: result.taskId, accountId } }),
      );
      await reload();
      showToast({ title: result.copyTaskId ? "已保留本地副本并恢复同步" : "已采用云端版本", tone: "success" });
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "处理失败，请重试。");
      setConfirmDiscard(false);
      await reload().catch(() => undefined);
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="task-sync-dialog"
      aria-labelledby={headingId}
      onCancel={(event) => {
        event.preventDefault();
        if (!saving) {
          if (confirmDiscard) setConfirmDiscard(false);
          else onClose();
        }
      }}
    >
      <header>
        <h2 id={headingId}>{confirmDiscard ? "替换本地版本？" : "处理同步冲突"}</h2>
        <button aria-label="关闭同步冲突" disabled={saving} onClick={onClose}>
          <X size={18} />
        </button>
      </header>
      {conflicts.length > 1 ? (
        <nav aria-label="待处理任务">
          {conflicts.map((item) => (
            <button
              key={item.taskId}
              aria-pressed={conflict.taskId === item.taskId}
              disabled={saving}
              onClick={() => {
                setSelectedId(item.taskId);
                setError(null);
              }}
            >
              {item.local.title}
            </button>
          ))}
        </nav>
      ) : null}
      <h3>{conflict.local.title}</h3>
      {error ? (
        <p role="alert" className="task-sync-error">
          {error}{" "}
          <button
            disabled={saving || reading}
            onClick={() => {
              setError(null);
              setReadVersion((n) => n + 1);
            }}
          >
            重新读取
          </button>
        </p>
      ) : null}
      {confirmDiscard ? (
        <p>此设备尚未同步的修改将被替换。保留云端版本后，原任务继续同步。</p>
      ) : (
        <div
          className="task-sync-comparison"
          aria-busy={reading}
          role="group"
          aria-label="本地与云端版本对比"
          tabIndex={0}
          data-lenis-prevent-wheel="true"
        >
          <ConflictVersion label="本地" task={conflict.local} other={conflict.remote} />
          <ConflictVersion label="云端" task={conflict.remote} other={conflict.local} />
        </div>
      )}
      <footer>
        {confirmDiscard ? (
          <>
            <button disabled={saving} onClick={() => setConfirmDiscard(false)}>
              返回对比
            </button>
            <button disabled={saving || reading} onClick={() => void resolve("use_cloud")}>
              确认采用云端版本
            </button>
          </>
        ) : (
          <>
            <button disabled={saving || reading || Boolean(error)} onClick={() => setConfirmDiscard(true)}>
              采用云端版本
            </button>
            <button
              className="task-sync-primary"
              disabled={saving || reading || Boolean(error)}
              onClick={() => void resolve("keep_both")}
            >
              {saving ? "正在保存…" : reading ? "正在读取…" : "保留本地副本并恢复同步"}
            </button>
          </>
        )}
      </footer>
    </dialog>
  );
}

function ConflictVersion({ label, task, other }: { label: string; task: Task; other: Task }) {
  const [expanded, setExpanded] = useState(false);
  const otherEvents = other.evolution?.events ?? [];
  const events = task.evolution?.events ?? [];
  let shared = 0;
  while (
    shared < events.length &&
    shared < otherEvents.length &&
    JSON.stringify(events[shared]) === JSON.stringify(otherEvents[shared])
  )
    shared++;
  const additions = events.slice(shared).filter((event) => event.kind !== "baseline");
  return (
    <section aria-label={`${label}版本`}>
      <div className="task-sync-version-label">
        <strong>{label}</strong>
        <span>
          {task.deletedAt
            ? "已删除"
            : task.status === "done"
              ? "已完成"
              : task.status === "in_progress"
                ? "进行中"
                : "待开始"}
        </span>
      </div>
      <h4>{task.evolution?.goal.objective ?? task.title}</h4>
      <p
        className={
          task.evolution?.goal.successCriteria !== other.evolution?.goal.successCriteria ? "task-sync-difference" : ""
        }
      >
        {task.evolution?.goal.successCriteria || "尚未设置完成标准"}
      </p>
      {task.description !== other.description ? <p>{task.description || "无说明"}</p> : null}
      <ol>
        {(expanded ? additions : additions.slice(-5)).map((event) => {
          const copy = describeEvolutionEvent(task.evolution!, event);
          return (
            <li key={event.id}>
              <strong>{copy.label}</strong>
              <p>{copy.detail}</p>
              <time dateTime={event.occurredAt}>{new Date(event.occurredAt).toLocaleString("zh-CN")}</time>
            </li>
          );
        })}
      </ol>
      {additions.length > 5 ? (
        <button onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>
          {expanded ? `收起${label}新增记录` : `查看${label}全部 ${additions.length} 条新增记录`}
        </button>
      ) : !additions.length ? (
        <small>无新增演进记录</small>
      ) : null}
    </section>
  );
}
