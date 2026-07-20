import { SettingsClient } from "@/features/settings/components/settings-client";
import { PageContainer } from "@/shared/components/layout/page-container";
import { PageHeader } from "@/shared/components/layout/page-header";

export default function SettingsPage() {
  return (
    <PageContainer>
      <SettingsClient />
    </PageContainer>
  );
}

