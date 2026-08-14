import "@/styles/auth.css";
import "@/styles/auth-v2.css";
import "@/styles/responsive-auth.css";

import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AuthExhibitionShell } from "@/features/auth/components/auth-exhibition-shell";
import { hasAppwriteEnv } from "@/shared/lib/appwrite/env";
import { getCurrentAuthEnvelope } from "@/shared/lib/appwrite/server";

type AuthLayoutProps = {
  children: ReactNode;
};

export default async function AuthLayout({ children }: AuthLayoutProps) {
  if (hasAppwriteEnv) {
    const auth = await getCurrentAuthEnvelope();

    if (auth?.user) {
      redirect("/dashboard");
    }
  }

  return <AuthExhibitionShell>{children}</AuthExhibitionShell>;
}
