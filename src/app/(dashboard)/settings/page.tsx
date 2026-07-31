import { SettingsClient } from "@/features/settings/components/settings-client";
import { PageContainer } from "@/shared/components/layout/page-container";
import { PageHeader } from "@/shared/components/layout/page-header";

export default function SettingsPage() {
  return (
    <PageContainer>
      <div className="desktop-page-header">
        <PageHeader eyebrow="个人信息" title="设置" description="管理个人资料和账号信息。" />
      </div>
      <SettingsClient />
    </PageContainer>
  );
}

