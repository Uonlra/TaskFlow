"use client";

import { useEffect, useRef, useState } from "react";

import { useReducedMotion } from "@/components/common/use-reduced-motion";

type ScrambleTextProps = {
  text: string;
  as?: "span" | "strong";
  className?: string;
  playKey?: string | number;
  durationMs?: number;
};

const scrambleCharacters = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function ScrambleText({
  text,
  as: Component = "span",
  className,
  playKey,
  durationMs = 520,
}: ScrambleTextProps) {
  const prefersReducedMotion = useReducedMotion();
  const [displayText, setDisplayText] = useState(text);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
    }

    if (prefersReducedMotion) {
      setDisplayText(text);
      return undefined;
    }

    const targetCharacters = Array.from(text);
    const totalFrames = Math.max(12, Math.round(durationMs / 28));
    let frame = 0;

    const tick = () => {
      const progress = frame / totalFrames;
      const nextText = targetCharacters
        .map((character, index) => {
          if (character.trim() === "") {
            return character;
          }

          const revealAt = index / Math.max(targetCharacters.length, 1);

          if (progress >= revealAt) {
            return character;
          }

          return scrambleCharacters[Math.floor(Math.random() * scrambleCharacters.length)];
        })
        .join("");

      setDisplayText(frame >= totalFrames ? text : nextText);

      if (frame < totalFrames) {
        frame += 1;
        frameRef.current = window.requestAnimationFrame(tick);
      }
    };

    tick();

    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, [durationMs, playKey, prefersReducedMotion, text]);

  return (
    <Component className={className} aria-label={text} suppressHydrationWarning>
      {displayText}
    </Component>
  );
}
