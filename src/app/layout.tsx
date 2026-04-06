import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AuthProvider } from "@/providers/auth-provider";
import { ToastProvider } from "@/providers/toast-provider";

export const metadata: Metadata = {
  title: "清衡任务台",
  description: "一个以中文阅读体验与专注节奏为中心的任务工作台。",
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="zh-CN">
      <body>
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
