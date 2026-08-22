import { Suspense } from "react";
import type { Metadata } from "next";

import { RegisterForm } from "@/features/auth/components/register-form";

export const metadata: Metadata = {
  title: "注册",
  description: "创建你的 U's Task Personal workspace。",
};

export default function RegisterPage() {
  return (
    <Suspense fallback={<p className="auth-form-message">正在准备注册表单...</p>}>
      <RegisterForm />
    </Suspense>
  );
}
