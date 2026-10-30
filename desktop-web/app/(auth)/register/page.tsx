import { Suspense } from "react";

import { RegisterForm } from "@/features/auth/components/register-form";

export default function DesktopRegisterPage() {
  return (
    <Suspense fallback={<p className="auth-form-message">正在准备注册表单...</p>}>
      <RegisterForm />
    </Suspense>
  );
}
