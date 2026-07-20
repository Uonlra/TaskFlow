"use client";

import { gsap } from "gsap";
import { Flip } from "gsap/Flip";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import { AuthProductPreview } from "@/features/auth/components/auth-product-preview";
import { AuthCustomCursor } from "@/features/auth/components/auth-custom-cursor";
import { AuthPreviewStateProvider } from "@/features/auth/components/auth-preview-state";
import type { AuthPreviewTab } from "@/features/auth/components/auth-preview-tabs";
import { useReducedMotion } from "@/shared/hooks/use-reduced-motion";

const exhibitionScenes: Record<
  AuthPreviewTab,
  {
    body: string;
    caption: string;
    index: string;
    metric: string;
    signal: string;
    title: string;
  }
> = {
  workspace: {
    body: "今天最要紧的事先摆上台面，进度、待办和优先级不用来回翻。",
    caption: "",
    index: "展片 01",
    metric: "今日进度",
    signal: "总览",
    title: "今日工作台",
  },
  tasks: {
    body: "待办、进行中、已完成分层站好，先处理谁、谁卡住了都更清楚。",
    caption: "",
    index: "展片 02",
    metric: "状态分层",
    signal: "清单",
    title: "任务列表",
  },
  calendar: {
    body: "时间线顺着日期展开，今天、明天和后续安排不再挤成一团。",
    caption: "",
    index: "展片 03",
    metric: "日期轨道",
    signal: "日程",
    title: "日历视图",
  },
  analytics: {
    body: "完成率、优先级和逾期信号一起露面，节奏有没有偏航更好判断。",
    caption: "",
    index: "展片 04",
    metric: "趋势信号",
    signal: "洞察",
    title: "统计分析",
  },
};

let gsapPluginsRegistered = false;

function registerGsapPlugins() {
  if (gsapPluginsRegistered) {
    return;
  }

  gsap.registerPlugin(Flip);
  gsapPluginsRegistered = true;
}

type AuthExhibitionShellProps = {
  children: ReactNode;
};

export function AuthExhibitionShell({ children }: AuthExhibitionShellProps) {
  const [activeTab, setActiveTab] = useState<AuthPreviewTab>("workspace");
  const rootRef = useRef<HTMLElement | null>(null);
  const flipScopeRef = useRef<HTMLDivElement | null>(null);
  const flipStateRef = useRef<ReturnType<typeof Flip.getState> | null>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion || !rootRef.current) {
      return undefined;
    }

    registerGsapPlugins();

    const context = gsap.context(() => {
      const timeline = gsap.timeline({
        defaults: {
          duration: 0.72,
          ease: "power3.out",
        },
      });

      timeline
        .fromTo(
          ".auth-frame",
          { autoAlpha: 0, clipPath: "inset(2.5% round 8px)" },
          { autoAlpha: 1, clipPath: "inset(0% round 8px)", duration: 0.68 },
        )
        .fromTo(
          ".auth-exhibition-image",
          { autoAlpha: 0, scale: 1.025, y: 22 },
          { autoAlpha: 1, scale: 1, y: 0, duration: 0.78 },
          "-=0.42",
        )
        .fromTo(
          ".auth-exhibition-plate, .auth-image-index, .auth-image-caption",
          { autoAlpha: 0, y: 18 },
          { autoAlpha: 1, y: 0, stagger: 0.045, duration: 0.56 },
          "-=0.42",
        )
        .fromTo(
          ".auth-brand-row, .auth-brand-title, .auth-brand-description, .auth-product-preview",
          { autoAlpha: 0, y: 16 },
          { autoAlpha: 1, y: 0, stagger: 0.07, duration: 0.58 },
          "-=0.34",
        )
        .fromTo(
          ".auth-form-shell",
          { autoAlpha: 0, y: 18 },
          { autoAlpha: 1, y: 0, duration: 0.62 },
          "-=0.42",
        );
    }, rootRef);

    return () => {
      context.revert();
    };
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (prefersReducedMotion || !flipStateRef.current) {
      flipStateRef.current = null;
      return;
    }

    registerGsapPlugins();

    Flip.from(flipStateRef.current, {
      absolute: true,
      duration: 0.68,
      ease: "power3.out",
      fade: true,
      scale: true,
      stagger: 0.035,
      onComplete: () => {
        flipStateRef.current = null;
      },
    });
  }, [activeTab, prefersReducedMotion]);

  const handleTabChange = (nextTab: AuthPreviewTab) => {
    if (nextTab === activeTab) {
      return;
    }

    if (!prefersReducedMotion && flipScopeRef.current) {
      registerGsapPlugins();
      const flipTargets = gsap.utils.toArray<HTMLElement>(
        "[data-auth-flip]",
        flipScopeRef.current,
      );
      flipStateRef.current = Flip.getState(flipTargets);
    }

    setActiveTab(nextTab);
  };

  const activeScene = exhibitionScenes[activeTab];

  return (
    <main ref={rootRef} className="auth-page">
      <AuthCustomCursor />
      <div className="auth-paper-layer" aria-hidden="true" />
      <div className="auth-noise-layer" aria-hidden="true" />
      <AuthPreviewStateProvider>
        <section className="auth-frame">
          <aside className="auth-brand-panel">
            <div
              ref={flipScopeRef}
              className={`auth-exhibition-image auth-exhibition-image--${activeTab}`}
              aria-hidden="true"
            >
              <div className="auth-exhibition-photo" data-auth-flip="photo">
                <img src="/auth-exhibition-study.svg" alt="" />
              </div>
              <div
                className="auth-exhibition-plate auth-exhibition-plate--primary"
                data-auth-flip="primary"
              >
                <span>{activeScene.signal}</span>
                <strong>{activeScene.title}</strong>
                <small>{activeScene.body}</small>
              </div>
              <div
                className="auth-exhibition-plate auth-exhibition-plate--metric"
                data-auth-flip="metric"
              >
                <span>指标</span>
                <strong>{activeScene.metric}</strong>
              </div>
              <div
                className="auth-exhibition-plate auth-exhibition-plate--signal"
                data-auth-flip="signal"
              >
                <span>视图</span>
                <strong>{activeScene.signal}</strong>
              </div>
              <span className="auth-image-index">{activeScene.index}</span>
              <span className="auth-image-caption">{activeScene.caption}</span>
            </div>

            <div className="auth-brand-copy">
              <div className="auth-brand-row">
                <span className="auth-brand-mark" aria-hidden="true">
                  ✓
                </span>
                <span className="section-eyebrow auth-brand-name">U&apos;s Task</span>
              </div>
              <h1 className="auth-brand-title">
                把每天的事项，
                <span>整理成清楚的任务展台</span>
              </h1>
              <p className="auth-brand-description">
                登录后会接上你的真实任务数据；未登录时先保留一张干净展板，让进度从 0 开始等待入场。
              </p>
            </div>

            <AuthProductPreview activeTab={activeTab} onTabChange={handleTabChange} />
          </aside>

          <section className="auth-form-panel">{children}</section>
        </section>
      </AuthPreviewStateProvider>
    </main>
  );
}
