"use client";

import { usePathname } from "next/navigation";

type WorkspaceStateNoticeProps = {
  description: string;
  title: string;
};

export function WorkspaceStateNotice({ description, title }: WorkspaceStateNoticeProps) {
  const pathname = usePathname();
  const loginHref = `/login?next=${encodeURIComponent(pathname)}`;

  return (
    <section className="workspace-state-notice" aria-label="访客浏览提示">
      <p>访客浏览</p>
      <h1>{title}</h1>
      <span>{description}</span>
      <a href={loginHref} data-auth-gate-bypass>登录后继续</a>
    </section>
  );
}

export function WorkspaceAuthCheckingNotice() {
  return (
    <section className="workspace-state-notice workspace-state-notice--checking" aria-live="polite">
      <p>正在确认账号状态</p>
      <h1>正在准备任务工作台</h1>
    </section>
  );
}
