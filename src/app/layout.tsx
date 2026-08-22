import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AuthProvider } from "@/features/auth/providers/auth-provider";
import { LenisProvider } from "@/shared/providers/lenis-provider";
import { ToastProvider } from "@/shared/providers/toast-provider";

export const metadata: Metadata = {
  title: {
    default: "U's Task | Personal workspace",
    template: "U's Task | %s",
  },
  description: "U's Task 是一个面向个人节奏的 Personal workspace，用来记录、整理和推进手头的事。",
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
