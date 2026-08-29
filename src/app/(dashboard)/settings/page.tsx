import "@/styles/settings.css";
import "@/styles/responsive-settings.css";

import { Suspense } from "react";
import { SettingsClient } from "@/features/settings/components/settings-client";
import type { Metadata } from "next";
import { PageContainer } from "@/shared/components/layout/page-container";
import { PageHeader } from "@/shared/components/layout/page-header";

export const metadata: Metadata = { title: "设置" };

export default function SettingsPage() {
  return (
    <PageContainer>
      <div className="desktop-page-header">
        <PageHeader eyebrow="个人信息" title="设置" description="管理个人资料和账号信息。" />
      </div>
      <Suspense fallback={<p className="settings-inline-note">正在加载设置...</p>}>
        <SettingsClient />
      </Suspense>
    </PageContainer>
  );
}
