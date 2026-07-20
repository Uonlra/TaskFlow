import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AuthProvider } from "@/features/auth/providers/auth-provider";
import { LenisProvider } from "@/shared/providers/lenis-provider";
import { ToastProvider } from "@/shared/providers/toast-provider";

export const metadata: Metadata = {
  title: "U's Task - 我的任务小本",
  description: "一个独立打磨的个人任务应用，用来记录、整理和慢慢推进手头的事。",
  icons: {
    icon: "/favicon.svg",
  },
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="zh-CN">
      <body>
        <AuthProvider>
          <ToastProvider>
            <LenisProvider>{children}</LenisProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
