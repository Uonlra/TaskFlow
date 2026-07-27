"use client";

import { useEffect, useState } from "react";

const authBackgroundVideoUrl =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260505_101331_74f9b798-3f00-4e86-8a01-377aa16ffeaa.mp4";

type NetworkInformationLike = EventTarget & {
  saveData?: boolean;
};

const backgroundSides = ["left", "right"] as const;

export function AuthPageBackground() {
  const [shouldRenderVideo, setShouldRenderVideo] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const wideViewport = window.matchMedia("(min-width: 1440px)");
    const connection = (navigator as Navigator & { connection?: NetworkInformationLike }).connection;
    const updateVideoPreference = () => {
      setShouldRenderVideo(wideViewport.matches && !reducedMotion.matches && !connection?.saveData);
    };

    updateVideoPreference();
    reducedMotion.addEventListener("change", updateVideoPreference);
    wideViewport.addEventListener("change", updateVideoPreference);
    connection?.addEventListener("change", updateVideoPreference);

    return () => {
      reducedMotion.removeEventListener("change", updateVideoPreference);
      wideViewport.removeEventListener("change", updateVideoPreference);
      connection?.removeEventListener("change", updateVideoPreference);
    };
  }, []);

  return (
    <div className="auth-page-background" aria-hidden="true">
      {shouldRenderVideo
        ? backgroundSides.map((side) => (
            <div className={"auth-page-background__rail auth-page-background__rail--" + side} key={side}>
              <video
                className={"auth-page-background__video auth-page-background__video--" + side}
                src={authBackgroundVideoUrl}
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
              />
            </div>
          ))
        : null}
    </div>
  );
}