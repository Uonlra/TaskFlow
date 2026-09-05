import "@/styles/settings.css";
import "@/styles/responsive-settings.css";

import { Suspense } from "react";
import { SettingsClient } from "@/features/settings/components/settings-client";
import type { Metadata } from "next";
import { PageContainer } from "@/shared/components/layout/page-container";

export const metadata: Metadata = { title: "设置" };

export default function SettingsPage() {
  return (
    <PageContainer>
      <h1 className="visually-hidden">设置</h1>
      <Suspense fallback={<p className="settings-inline-note">正在加载设置...</p>}>
        <SettingsClient />
      </Suspense>
    </PageContainer>
  );
}
