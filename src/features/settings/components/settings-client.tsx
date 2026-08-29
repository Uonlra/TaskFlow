"use client";

import { useForm } from "react-hook-form";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CircleHelp, Database, LockKeyhole, PlugZap, SlidersHorizontal, UserRound } from "lucide-react";

import { MobileSettingsView } from "@/features/settings/components/mobile-settings-view";
import type { ProfileFormValues } from "@/features/auth/types/profile.types";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { useToast } from "@/shared/providers/toast-provider";

export function SettingsClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { profile, user, isProfileLoading, saveProfile, signOut } = useAuth();
  const { showToast } = useToast();
  const {
    register,
    handleSubmit,
    watch,
    formState: { isSubmitting },
  } = useForm<ProfileFormValues>({
    values: {
      fullName: profile?.fullName ?? "",
      avatarUrl: profile?.avatarUrl ?? "",
    },
  });
  const avatarPreview = watch("avatarUrl");
  const namePreview = watch("fullName");

  const onSubmit = async (values: ProfileFormValues) => {
    try {
      await saveProfile(values);
      showToast({
        title: "资料已保存",
        description: "你的个人信息已经更新。",
        tone: "success",
      });
    } catch (error) {
      showToast({
        title: "资料更新失败",
        description: error instanceof Error ? error.message : "请稍后再试。",
        tone: "error",
      });
    }
  };
  const handleSignOut = async () => {
    await signOut();
    showToast({
      title: "已退出登录",
      description: "当前会话已结束，可以换个账号继续。",
      tone: "success",
    });
    router.push("/login");
  };

  const displayName = namePreview || profile?.fullName || user?.email || "访客";
  const displayEmail = profile?.email || user?.email || "暂无邮箱信息";
  const isAuthenticated = Boolean(user);
  const activeSection = parseSettingsSection(searchParams.get("section"));
  const changeSection = (section: SettingsSection) => {
    router.replace(`${pathname}?section=${section}`, { scroll: false });
  };
  const handleAccountAction = async () => {
    if (!isAuthenticated) {
      router.push(`/login?next=${encodeURIComponent(`${pathname}?section=account`)}`);
      return;
    }
    await handleSignOut();
  };

  return (
    <>
      <div className="settings-mobile-only">
        <MobileSettingsView
          displayName={displayName}
          email={displayEmail}
          avatarUrl={avatarPreview}
          isAuthenticated={isAuthenticated}
          isProfileLoading={isProfileLoading}
          onSaveProfile={saveProfile}
          onSignOut={handleAccountAction}
        />
      </div>
      <section className="settings-desktop-only settings-desktop">
        <section className="settings-grid">
          <aside className="settings-profile-panel settings-navigation-panel">
            <div className="settings-navigation-intro">
              <span className={isAuthenticated ? "settings-status-dot is-connected" : "settings-status-dot"} />
              <div>
                <strong>{isAuthenticated ? "账号已连接" : "访客工作区"}</strong>
                <span>{isAuthenticated ? "资料和任务会安全同步" : "任务仅保存在此标签页"}</span>
              </div>
            </div>
            <div className="settings-profile-card">
              <div className="settings-profile-card__avatar">
                {avatarPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarPreview} alt={namePreview || user?.email || "头像预览"} />
                ) : (
                  <span>{(namePreview || user?.email || "演").slice(0, 1).toUpperCase()}</span>
                )}
              </div>
              <div className="settings-profile-card__copy">
                <strong>{namePreview || "未设置姓名"}</strong>
                <span>{profile?.email || user?.email || "暂无邮箱信息"}</span>
              </div>
            </div>
            <nav className="settings-section-nav" aria-label="设置分类">
              {settingsSections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    type="button"
                    className={activeSection === section.id ? "is-active" : ""}
                    aria-current={activeSection === section.id ? "page" : undefined}
                    onClick={() => changeSection(section.id)}
                  >
                    <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
                    <span>
                      <strong>{section.label}</strong>
                      <small>{section.description}</small>
                    </span>
                  </button>
                );
              })}
            </nav>
            <button type="button" className="settings-nav-account-action" onClick={handleAccountAction}>
              {isAuthenticated ? "退出登录" : "登录并同步"}
            </button>
          </aside>

          <section className="settings-form-panel">
            <SettingsSectionHeader section={activeSection} />
            {activeSection === "account" ? (
              <form onSubmit={handleSubmit(onSubmit)} className="settings-form">
                <div className="settings-form__fields">
                  <label className="settings-field">
                    <span>姓名</span>
                    <input
                      {...register("fullName")}
                      placeholder="请输入你的昵称"
                      disabled={!isAuthenticated || isProfileLoading}
                    />
                    <small>
                      {isAuthenticated ? "用于顶栏、头像菜单和任务归属提示。" : "登录后可编辑个人身份信息。"}
                    </small>
                  </label>

                  <label className="settings-field">
                    <span>头像地址</span>
                    <input
                      {...register("avatarUrl")}
                      placeholder="https://example.com/avatar.jpg"
                      disabled={!isAuthenticated || isProfileLoading}
                    />
                    <small>
                      {isAuthenticated ? "建议使用稳定、可公开访问的图片地址。" : "登录后可编辑个人身份信息。"}
                    </small>
                  </label>

                  <div className="settings-field">
                    <span>账号邮箱</span>
                    <div className="settings-readonly-field">
                      <span>{profile?.email || user?.email || "暂无邮箱信息"}</span>
                      {isAuthenticated ? <b>已验证</b> : <b className="is-locked">只读</b>}
                    </div>
                    <small>邮箱用于登录和账号通知，暂不支持在此修改。</small>
                  </div>
                </div>

                <div className="settings-form__footer">
                  <span>
                    {isAuthenticated
                      ? "最后一次修改会立即同步到当前工作区。"
                      : "访客资料为只读，登录后可同步个人信息。"}
                  </span>
                  {isAuthenticated ? (
                    <button type="submit" disabled={isSubmitting || isProfileLoading}>
                      <span aria-hidden="true">↗</span>
                      {isSubmitting ? "保存中..." : "保存资料"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => router.push(`/login?next=${encodeURIComponent(`${pathname}?section=account`)}`)}
                    >
                      登录后编辑
                    </button>
                  )}
                </div>
              </form>
            ) : (
              <SettingsReadOnlySection
                section={activeSection}
                isAuthenticated={isAuthenticated}
                onLogin={() => router.push(`/login?next=${encodeURIComponent(`${pathname}?section=${activeSection}`)}`)}
              />
            )}
          </section>
        </section>
      </section>
    </>
  );
}

type SettingsSection = "account" | "preferences" | "integrations" | "data" | "support";

const settingsSections: Array<{
  id: SettingsSection;
  label: string;
  description: string;
  icon: typeof UserRound;
}> = [
  { id: "account", label: "账户", description: "个人资料与登录", icon: UserRound },
  { id: "preferences", label: "偏好", description: "外观与任务习惯", icon: SlidersHorizontal },
  { id: "integrations", label: "集成", description: "日历与外部服务", icon: PlugZap },
  { id: "data", label: "数据与隐私", description: "备份与数据说明", icon: Database },
  { id: "support", label: "支持", description: "帮助与关于", icon: CircleHelp },
];

function parseSettingsSection(value: string | null): SettingsSection {
  return settingsSections.some((section) => section.id === value) ? (value as SettingsSection) : "account";
}

function SettingsSectionHeader({ section }: { section: SettingsSection }) {
  const current = settingsSections.find((item) => item.id === section) ?? settingsSections[0];
  return (
    <div className="settings-panel-heading settings-panel-heading--form">
      <div>
        <span className="settings-panel-kicker">设置中心</span>
        <h2>{current.label}</h2>
        <p>{current.description}。设置会按照当前设备和账号状态保存。</p>
      </div>
      <span className="settings-form-index">{String(settingsSections.indexOf(current) + 1).padStart(2, "0")}</span>
    </div>
  );
}

function SettingsReadOnlySection({
  section,
  isAuthenticated,
  onLogin,
}: {
  section: SettingsSection;
  isAuthenticated: boolean;
  onLogin: () => void;
}) {
  const rows =
    section === "preferences"
      ? [
          ["主题模式", "浅色", "已支持，访客登录后可修改"],
          ["语言", "简体中文", "即将支持"],
          ["通知", "已开启", "即将支持"],
          ["任务偏好", "默认排序", "即将支持"],
        ]
      : section === "integrations"
        ? [["日历同步", "未连接", "即将支持"]]
        : section === "data"
          ? [["数据备份", "导出当前任务", "访客也可以导出当前标签页的任务"]]
          : section === "support"
            ? [["帮助", "查看使用说明", "了解任务、日历和统计页面"]]
            : [];

  return (
    <div className="settings-readonly-section">
      {!isAuthenticated && section !== "data" && section !== "support" ? (
        <div className="settings-guest-banner">
          <LockKeyhole size={17} aria-hidden="true" />
          <div>
            <strong>访客工作区</strong>
            <p>当前设置仅供查看。登录后可以修改已支持的账号和偏好设置。</p>
          </div>
          <button type="button" onClick={onLogin}>
            登录并同步
          </button>
        </div>
      ) : null}
      <div className="settings-option-list">
        {rows.map(([label, value, description]) => (
          <div key={label} className="settings-option-row">
            <div>
              <strong>{label}</strong>
              <small>{description}</small>
            </div>
            <span>{value}</span>
          </div>
        ))}
      </div>
      {section === "data" ? (
        <p className="settings-inline-note">访客任务只存在于当前标签页，关闭标签页后会自动清除。</p>
      ) : null}
    </div>
  );
}
