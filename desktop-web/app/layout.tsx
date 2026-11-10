import "@/app/globals.css";

import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AppProviders } from "@/shared/providers/app-providers";

export const metadata: Metadata = {
  title: {
    default: "U's Task | Personal workspace",
    template: "U's Task | %s",
  },
  description: "U's Task 是一个面向个人节奏的 Personal workspace，用来记录、整理和推进手头的事。",
  icons: { icon: "/favicon.svg" },
};

export default function DesktopRootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
