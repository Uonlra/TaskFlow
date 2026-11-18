"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type ReactNode, type MouseEvent } from "react";
import { AlertCircle, LoaderCircle } from "lucide-react";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { ApiRequestError } from "@/shared/lib/api/client";
import { loadRelatedTask } from "../utils/load-related-task";

export function TaskRelationLink({
  taskId,
  href,
  children,
  title,
  className,
}: {
  taskId: string;
  href: string;
  children: ReactNode;
  title?: string;
  className?: string;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const scope = JSON.stringify([user?.id ?? null, taskId, href]);
  const [state, setState] = useState<{ scope: string; loading: boolean; error: string | null } | null>(null);
  const request = useRef<AbortController | null>(null);
  const errorId = useId();
  useEffect(() => () => request.current?.abort(), [scope]);
  const current = state?.scope === scope ? state : null;

  async function follow(event?: MouseEvent<HTMLAnchorElement>) {
    if (event && (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0)) return;
    event?.preventDefault();
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setState({ scope, loading: true, error: null });
    try {
      const task = await loadRelatedTask(taskId, user?.id, controller.signal);
      if (controller.signal.aborted) return;
      if (!task || task.deletedAt) {
        setState({ scope, loading: false, error: "未找到关联任务" });
        return;
      }
      if (task.id !== taskId) throw new Error("关联任务数据不匹配。");
      setState({ scope, loading: false, error: null });
      router.push(href);
    } catch (error) {
      if (controller.signal.aborted) return;
      const message =
        error instanceof ApiRequestError
          ? error.status === 401
            ? "登录后可查看"
            : error.status === 403
              ? "暂无访问权限"
              : error.status === 404
                ? "未找到关联任务"
                : "暂时无法读取"
          : "暂时无法读取";
      setState({ scope, loading: false, error: message });
    }
  }
  return (
    <span className="task-relation" data-auth-gate-bypass>
      <Link
        href={href}
        prefetch={false}
        title={title}
        className={className}
        onClick={(event) => void follow(event)}
        aria-busy={current?.loading || undefined}
        aria-describedby={current?.error ? errorId : undefined}
      >
        {children}
        {current?.loading ? <LoaderCircle size={12} className="task-relation-spinner" aria-hidden="true" /> : null}
      </Link>
      {current?.error ? (
        <span className="task-relation-status" id={errorId} role="status">
          <AlertCircle size={12} aria-hidden="true" />
          {current.error}
          <button type="button" onClick={() => void follow()}>
            重试
          </button>
        </span>
      ) : null}
    </span>
  );
}
