import { Suspense } from "react";

import { LoginForm } from "@/features/auth/components/login-form";

export default function LoginPage() {
  return (
    <Suspense fallback={<p className="auth-form-message">正在准备登录表单...</p>}>
      <LoginForm />
    </Suspense>
  );
}
