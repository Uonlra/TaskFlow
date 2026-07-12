import { SettingsClient } from "@/components/settings/settings-client";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";

export default function SettingsPage() {
  return (
    <PageContainer>
      <PageHeader
        eyebrow="设置"
        title="留一点自己的痕迹"
        description="设置姓名、头像和账号信息，让这个任务本更像你平时会打开的工具。"
      />
      <SettingsClient />
    </PageContainer>
  );
}

