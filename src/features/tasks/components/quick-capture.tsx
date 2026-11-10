"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Trash2 } from "lucide-react";
import { getDesktopBridge } from "@/shared/lib/desktop/bridge";
import type { TaskFormValues } from "@/features/tasks/schemas/task-schema";
import "@/styles/desktop-controls.css";

const empty: TaskFormValues = { title: "", description: "", status: "todo", priority: "medium", tags: "", dueDate: "" };

export function QuickCapture() {
  const [values, setValues] = useState(empty);
  const [workspace, setWorkspace] = useState<string>();
  const workspaceRef = useRef<string | undefined>(undefined);
  const [nextWorkspace, setNextWorkspace] = useState<string>();
  const [available, setAvailable] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [details, setDetails] = useState(false);
  const title = useRef<HTMLInputElement>(null);
  const pending = useRef(false);
  useEffect(() => {
    const bridge = getDesktopBridge();
    if (!bridge?.shell?.quickWindow || !bridge.quickCapture) return;
    const focus = () => {
      title.current?.focus();
      void bridge.workspace
        .get()
        .then((next) => {
          setAvailable(true);
          if (workspaceRef.current && workspaceRef.current !== next.accountId) setNextWorkspace(next.accountId);
          else {
            workspaceRef.current = next.accountId;
            setWorkspace(next.accountId);
            setNextWorkspace(undefined);
          }
        })
        .catch(() => {
          setAvailable(true);
          setError("无法读取本地工作区，请稍后重试。");
        });
    };
    focus();
    const off = bridge.quickCapture.onFocus(focus);
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.isComposing && !pending.current) void bridge.quickCapture!.hide();
    };
    window.addEventListener("keydown", key);
    return () => {
      off();
      window.removeEventListener("keydown", key);
    };
  }, []);
  useEffect(() => {
    if (available) title.current?.focus();
  }, [available]);
  const submit = async () => {
    if (pending.current || !workspace || nextWorkspace) return;
    if (!values.title.trim()) {
      setError("先写下任务标题。");
      title.current?.focus();
      return;
    }
    pending.current = true;
    setSaving(true);
    setError("");
    try {
      const capture = getDesktopBridge()!.quickCapture!;
      await capture.create({ accountId: workspace, task: { ...values, title: values.title.trim() } });
      setValues(empty);
      setDetails(false);
      await capture.hide();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "保存失败，内容已保留，请重试。");
    } finally {
      pending.current = false;
      setSaving(false);
    }
  };
  if (!available)
    return (
      <main className="quick-capture">
        <h1>快速记录</h1>
        <p>请从桌面应用的快捷键或应用菜单打开。</p>
      </main>
    );
  return (
    <main className="quick-capture" aria-label="快速记录">
      {nextWorkspace && (
        <div role="status" className="capture-error">
          工作区已切换。
          <button
            type="button"
            onClick={() => {
              workspaceRef.current = nextWorkspace;
              setWorkspace(nextWorkspace);
              setNextWorkspace(undefined);
              setError("");
            }}
          >
            切换工作区
          </button>
        </div>
      )}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" && event.nativeEvent.isComposing) {
            event.preventDefault();
            return;
          }
          if (event.key === "Enter" && event.ctrlKey) {
            event.preventDefault();
            void submit();
          } else if (event.key === "Enter" && event.target instanceof HTMLInputElement) event.preventDefault();
        }}
      >
        <fieldset disabled={saving}>
          <input
            ref={title}
            id="capture-title"
            aria-label="任务标题"
            placeholder="任务"
            value={values.title}
            onChange={(event) => setValues({ ...values, title: event.target.value })}
            autoComplete="off"
          />
          <textarea
            id="capture-description"
            aria-label="备注"
            placeholder="备注"
            value={values.description}
            onChange={(event) => setValues({ ...values, description: event.target.value })}
            rows={2}
          />
          <button
            type="button"
            className="capture-details-toggle"
            aria-expanded={details}
            aria-controls="capture-details"
            onClick={() => setDetails(!details)}
          >
            更多
            <ChevronDown size={14} aria-hidden="true" />
          </button>
          {details && (
            <div className="capture-details" id="capture-details">
              <label>
                日期
                <input
                  type="date"
                  value={values.dueDate}
                  onChange={(event) => setValues({ ...values, dueDate: event.target.value })}
                />
              </label>
              <label>
                优先级
                <select
                  value={values.priority}
                  onChange={(event) =>
                    setValues({ ...values, priority: event.target.value as TaskFormValues["priority"] })
                  }
                >
                  <option value="low">低</option>
                  <option value="medium">中</option>
                  <option value="high">高</option>
                </select>
              </label>
              <label>
                标签
                <input
                  value={values.tags}
                  placeholder="逗号分隔"
                  onChange={(event) => setValues({ ...values, tags: event.target.value })}
                />
              </label>
            </div>
          )}
        </fieldset>
        {error && (
          <p role="alert" className="capture-error">
            {error}
          </p>
        )}
        <footer>
          <button
            className="capture-clear"
            aria-label="清空草稿"
            title="清空草稿"
            type="button"
            disabled={saving || !(values.title || values.description || values.tags || values.dueDate)}
            onClick={() => {
              setValues(empty);
              setError("");
              title.current?.focus();
            }}
          >
            <Trash2 size={16} aria-hidden="true" />
          </button>
          <button
            type="submit"
            aria-label="记录任务"
            title="Ctrl+Enter"
            disabled={saving || !workspace || Boolean(nextWorkspace)}
          >
            {saving ? "保存中…" : "添加"}
          </button>
        </footer>
      </form>
    </main>
  );
}
