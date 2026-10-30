import "@/styles/settings.css";
import "@/styles/responsive-settings.css";

import { Suspense } from "react";

import { SettingsClient } from "@/features/settings/components/settings-client";
import { PageContainer } from "@/shared/components/layout/page-container";

export default function DesktopSettingsPage() {
  return (
    <PageContainer>
      <h1 className="visually-hidden">设置</h1>
      <Suspense fallback={<p className="settings-inline-note">正在加载设置...</p>}>
        <SettingsClient />
      </Suspense>
    </PageContainer>
  );
}
