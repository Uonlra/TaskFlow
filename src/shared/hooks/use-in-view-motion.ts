"use client";

import { useEffect, useRef, useState } from "react";

import { useReducedMotion } from "@/shared/hooks/use-reduced-motion";

type UseInViewMotionOptions = {
  rootMargin?: string;
  threshold?: number;
};

export function useInViewMotion<TElement extends HTMLElement>({
  rootMargin = "0px 0px -12% 0px",
  threshold = 0.12,
}: UseInViewMotionOptions = {}) {
  const elementRef = useRef<TElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const element = elementRef.current;

    if (!element || prefersReducedMotion) {
      setIsVisible(true);
      return undefined;
    }

    const fallbackId = window.setTimeout(() => {
      setIsVisible(true);
    }, 180);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          window.clearTimeout(fallbackId);
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        rootMargin,
        threshold,
      },
    );

    observer.observe(element);

    return () => {
      window.clearTimeout(fallbackId);
      observer.disconnect();
    };
  }, [prefersReducedMotion, rootMargin, threshold]);

  return {
    ref: elementRef,
    isVisible,
  };
}
