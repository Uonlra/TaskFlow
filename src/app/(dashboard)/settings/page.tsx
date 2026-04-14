import { SettingsClient } from "@/components/settings/settings-client";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";

export default function SettingsPage() {
  return (
    <PageContainer>
      <PageHeader
        eyebrow="设置"
        title="让你的身份信息与工作台风格保持一致"
        description="统一姓名、头像和账号信息，让导航、顶部信息区和设置页都呈现出一致的个人工作台状态。"
      />
      <SettingsClient />
    </PageContainer>
  );
}
