"use client";

import type { CSSProperties, ElementType, ReactNode } from "react";

import { useInViewMotion } from "@/components/common/use-in-view-motion";

type AnimatedSectionProps = {
  as?: ElementType;
  children: ReactNode;
  className?: string;
  delayMs?: number;
  style?: CSSProperties;
};

export function AnimatedSection({
  as: Component = "section",
  children,
  className = "",
  delayMs = 0,
  style,
}: AnimatedSectionProps) {
  const { ref, isVisible } = useInViewMotion<HTMLElement>();
  const motionClassName = isVisible ? "motion-section motion-section--visible" : "motion-section motion-section--waiting";
  const motionStyle = {
    ...style,
    "--motion-delay": `${delayMs}ms`,
  } as CSSProperties;

  return (
    <Component ref={ref} className={`${motionClassName}${className ? ` ${className}` : ""}`} style={motionStyle}>
      {children}
    </Component>
  );
}
