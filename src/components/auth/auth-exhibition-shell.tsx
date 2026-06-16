"use client";

import { gsap } from "gsap";
import { Flip } from "gsap/Flip";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import { AuthProductPreview } from "@/components/auth/auth-product-preview";
import { AuthPreviewStateProvider } from "@/components/auth/auth-preview-state";
import type { AuthPreviewTab } from "@/components/auth/auth-preview-tabs";
import { useReducedMotion } from "@/components/common/use-reduced-motion";

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
    body: "今日重点会被摆上台面，先看进度，再决定从哪一件开始。",
    caption: "Today workspace / private study",
    index: "Plate 01",
    metric: "0-100%",
    signal: "focus",
    title: "今日工作台",
  },
  tasks: {
    body: "任务以清单和状态灯呈现，待办、推进、完成都各站各位。",
    caption: "Task queue / status study",
    index: "Plate 02",
    metric: "3 states",
    signal: "queue",
    title: "任务展架",
  },
  calendar: {
    body: "日期安排被按时间线展开，今天、明天、之后不再挤作一团。",
    caption: "Calendar view / sequence study",
    index: "Plate 03",
    metric: "due map",
    signal: "time",
    title: "日期安排",
  },
  analytics: {
    body: "统计只负责把趋势说清楚，完成率、优先级和逾期都会露面。",
    caption: "Analytics view / signal study",
    index: "Plate 04",
    metric: "signals",
    signal: "insight",
    title: "简单统计",
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
                <span>measure</span>
                <strong>{activeScene.metric}</strong>
              </div>
              <div
                className="auth-exhibition-plate auth-exhibition-plate--signal"
                data-auth-flip="signal"
              >
                <span>mode</span>
                <strong>{activeScene.index}</strong>
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
                把日常事务，
                <span>整理成一场清晰展览</span>
              </h1>
              <p className="auth-brand-description">
                登录后预览会接上你的真实任务数据；未登录时先保持留白，让进度从 0 开始等待入场。
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
