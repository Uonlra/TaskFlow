import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AuthExhibitionShell } from "@/components/auth/auth-exhibition-shell";
import { hasAppwriteEnv } from "@/lib/appwrite/env";
import { getCurrentAuthEnvelope } from "@/lib/appwrite/server";

type AuthLayoutProps = {
  children: ReactNode;
};

export default async function AuthLayout({ children }: AuthLayoutProps) {
  if (hasAppwriteEnv) {
    const auth = await getCurrentAuthEnvelope();

    if (auth?.user?.emailVerified) {
      redirect("/dashboard");
    }
  }

  return <AuthExhibitionShell>{children}</AuthExhibitionShell>;
}
