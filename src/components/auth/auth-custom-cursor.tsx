"use client";

import { useEffect, useRef, useState } from "react";

import { useReducedMotion } from "@/components/common/use-reduced-motion";

type AuthCursorState = "default" | "button" | "tab" | "media" | "hidden";

const cursorLabels: Record<AuthCursorState, string> = {
  button: "点击",
  default: "浏览",
  hidden: "",
  media: "预览",
  tab: "切换",
};

function getCursorState(target: EventTarget | null): AuthCursorState {
  if (!(target instanceof Element)) {
    return "default";
  }

  if (target.closest('input, textarea, select, [contenteditable="true"]')) {
    return "hidden";
  }

  if (target.closest("[data-auth-preview-tab], .auth-preview-nav")) {
    return "tab";
  }

  if (target.closest(".auth-exhibition-image, .auth-exhibition-photo")) {
    return "media";
  }

  if (target.closest("button, [role='button'], a, label")) {
    return "button";
  }

  return "default";
}

export function AuthCustomCursor() {
  const cursorRef = useRef<HTMLDivElement | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion || typeof window === "undefined") {
      setIsActive(false);
      return undefined;
    }

    const mediaQuery = window.matchMedia("(hover: hover) and (pointer: fine)");

    const syncActivation = () => {
      setIsActive(mediaQuery.matches);
    };

    syncActivation();
    mediaQuery.addEventListener("change", syncActivation);

    return () => {
      mediaQuery.removeEventListener("change", syncActivation);
    };
  }, [prefersReducedMotion]);

  useEffect(() => {
    const cursor = cursorRef.current;
    const root = document.documentElement;

    if (!isActive || !cursor) {
      delete root.dataset.authCursor;
      return undefined;
    }

    root.dataset.authCursor = "active";

    let rafId = 0;
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    let state: AuthCursorState = "default";
    let isVisible = false;
    let isPressed = false;

    const render = () => {
      cursor.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      cursor.dataset.state = state;
      cursor.dataset.visible = isVisible ? "true" : "false";
      cursor.dataset.pressed = isPressed ? "true" : "false";
      cursor.dataset.label = cursorLabels[state];
      rafId = 0;
    };

    const scheduleRender = () => {
      if (!rafId) {
        rafId = window.requestAnimationFrame(render);
      }
    };

    const hideCursor = () => {
      isVisible = false;
      isPressed = false;
      scheduleRender();
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") {
        return;
      }

      x = event.clientX;
      y = event.clientY;
      isVisible = true;
      state = getCursorState(event.target);
      scheduleRender();
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (event.pointerType === "touch") {
        return;
      }

      isPressed = state !== "hidden";
      scheduleRender();
    };

    const handlePointerUp = () => {
      isPressed = false;
      scheduleRender();
    };

    const handlePointerOut = (event: MouseEvent) => {
      if (!event.relatedTarget) {
        hideCursor();
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        hideCursor();
      }
    };

    const handleFocusIn = (event: FocusEvent) => {
      const nextState = getCursorState(event.target);
      state = nextState;
      if (nextState === "hidden") {
        isVisible = false;
      }
      scheduleRender();
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerdown", handlePointerDown, { passive: true });
    window.addEventListener("pointerup", handlePointerUp, { passive: true });
    window.addEventListener("pointercancel", handlePointerUp, { passive: true });
    document.addEventListener("mouseout", handlePointerOut);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("focusin", handleFocusIn);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
      document.removeEventListener("mouseout", handlePointerOut);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("focusin", handleFocusIn);
      delete root.dataset.authCursor;
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [isActive]);

  if (!isActive) {
    return null;
  }

  return (
    <div
      ref={cursorRef}
      className="auth-custom-cursor"
      aria-hidden="true"
      data-label="浏览"
      data-pressed="false"
      data-state="default"
      data-visible="false"
    >
      <span className="auth-custom-cursor__ring" />
      <span className="auth-custom-cursor__core" />
    </div>
  );
}
