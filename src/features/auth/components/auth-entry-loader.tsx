"use client";

import { createTimeline, engine } from "animejs";
import { useEffect, useRef, useState } from "react";

import { BrandMark } from "@/shared/components/layout/brand-mark";

const ENTRY_ANIMATION_DURATION = 2500;

/**
 * A brief, one-time transition that lets the auth workspace settle before it
 * is revealed. It is deliberately kept separate from authentication state.
 */
export function AuthEntryLoader() {
  const loaderRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const loader = loaderRef.current;
    const authFrame = document.querySelector<HTMLElement>("[data-auth-entry-target]");

    if (!loader || !authFrame) {
      const dismissFrame = window.requestAnimationFrame(() => setIsVisible(false));
      return () => window.cancelAnimationFrame(dismissFrame);
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (reducedMotion.matches) {
      const dismissFrame = window.requestAnimationFrame(() => setIsVisible(false));
      return () => window.cancelAnimationFrame(dismissFrame);
    }

    const mark = loader.querySelector<HTMLElement>(".auth-entry-loader__mark");
    const copy = loader.querySelector<HTMLElement>(".auth-entry-loader__copy");
    const progress = loader.querySelector<HTMLElement>(".auth-entry-loader__progress-fill");

    const timeline = createTimeline({
      autoplay: false,
      onComplete: () => setIsVisible(false),
    });

    if (mark) {
      timeline.add(mark, { opacity: [0, 1], scale: [0.72, 1], duration: 380, ease: "outExpo" }, 0);
    }

    if (copy) {
      timeline.add(copy, { opacity: [0, 1], translateY: [14, 0], duration: 360, ease: "outExpo" }, 140);
    }

    if (progress) {
      timeline.add(progress, { scaleX: [0, 1], duration: 1100, ease: "inOut(2.4)" }, 240);
    }

    timeline
      .add(loader, { translateY: ["0%", "-104%"], duration: 700, ease: "inOut(2.4)" }, 1450)
      .add(
        authFrame,
        { opacity: [0, 1], translateY: [18, 0], scale: [0.985, 1], duration: 500, ease: "outExpo" },
        ENTRY_ANIMATION_DURATION - 500,
      );

    const handleVisibilityChange = () => {
      // Anime.js' engine is paused while the tab is hidden, so the short
      // transition does not finish away from the user.
      if (document.hidden) {
        engine.pause();
      } else {
        engine.resume();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    const animationFrame = window.requestAnimationFrame(() => timeline.play());

    return () => {
      window.cancelAnimationFrame(animationFrame);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      timeline.pause();
      timeline.revert();
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div className="auth-entry-loader" ref={loaderRef} aria-live="polite" aria-label="正在准备登录页面">
      <div className="auth-entry-loader__content">
        <BrandMark className="auth-entry-loader__mark" />
        <div className="auth-entry-loader__copy">
          <strong>U&apos;s Task</strong>
          <span>Personal workspace · 正在准备你的任务工作台</span>
        </div>
        <span className="auth-entry-loader__progress" aria-hidden="true">
          <i className="auth-entry-loader__progress-fill" />
        </span>
      </div>
    </div>
  );
}
