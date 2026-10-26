import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "U's Task",
    short_name: "TaskFlow",
    description: "跨平台个人任务工作台，支持 Web、PWA、移动端与桌面端协作。",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#05070a",
    theme_color: "#05070a",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/favicon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
    screenshots: [
      {
        src: "/screenshots/dashboard.png",
        sizes: "1536x1024",
        type: "image/png",
        form_factor: "wide",
      },
    ],
  };
}
