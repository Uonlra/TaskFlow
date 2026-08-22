import { Suspense } from "react";
import type { Metadata } from "next";

import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = {
  title: "登录",
  description: "登录 U's Task Personal workspace。",
};

export default function LoginPage() {
  return (
    <Suspense fallback={<p className="auth-form-message">正在准备登录表单...</p>}>
      <LoginForm />
    </Suspense>
  );
}
