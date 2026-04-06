import { SettingsClient } from "@/components/settings/settings-client";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";

export default function SettingsPage() {
  return (
    <PageContainer>
      <PageHeader
        eyebrow="设置"
        title="调整你的工作台资料"
        description="更新姓名、头像和账号信息，让整个应用里的身份展示保持一致。"
      />
      <SettingsClient />
    </PageContainer>
  );
}
