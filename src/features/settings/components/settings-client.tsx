"use client";

import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";

import { MobileSettingsView } from "@/features/settings/components/mobile-settings-view";
import type { ProfileFormValues } from "@/features/auth/types/profile.types";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { useToast } from "@/shared/providers/toast-provider";

export function SettingsClient() {
  const router = useRouter();
  const { profile, user, isConfigured, isProfileLoading, saveProfile, signOut } = useAuth();
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

  return (
    <>
      <div className="settings-mobile-only">
        <MobileSettingsView
          displayName={displayName}
          email={displayEmail}
          avatarUrl={avatarPreview}
          isConfigured={Boolean(user)}
          onSignOut={handleSignOut}
        />
      </div>
      <section className="settings-desktop-only settings-desktop">
        <section className="settings-grid">
          <aside className="settings-profile-panel">
            <div className="settings-panel-heading">

              <span className="settings-status-dot" aria-label={isConfigured ? "已连接" : "未连接"} />
            </div>

            <div className="settings-profile-card">
              <div className="settings-profile-card__avatar">
              {avatarPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarPreview}
                  alt={namePreview || user?.email || "头像预览"}
                />
              ) : (
                <span>{(namePreview || user?.email || "演").slice(0, 1).toUpperCase()}</span>
              )}
              </div>
              <div className="settings-profile-card__copy">
                <strong>{namePreview || "未设置姓名"}</strong>
                <span>{profile?.email || user?.email || "暂无邮箱信息"}</span>
              </div>
            </div>

            <div className="settings-profile-note">
              <span className="settings-profile-note__icon" aria-hidden="true">✓</span>
              <div>
                <strong>{isConfigured ? "账号已连接" : "当前为访客模式"}</strong>
                <p>{isConfigured ? "资料会同步到你的工作区。" : "登录后即可同步个人资料。"}</p>
              </div>
            </div>
          </aside>

          <section className="settings-form-panel">
            <div className="settings-panel-heading settings-panel-heading--form">
              <div>
                <span className="settings-panel-kicker">账号设置</span>
                <h2>个人资料</h2>
                <p>更新会在顶栏和工作区中显示的身份信息。</p>
              </div>
              <span className="settings-form-index">01</span>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="settings-form">
              <div className="settings-form__fields">
                <label className="settings-field">
                  <span>姓名</span>
                  <input
                    {...register("fullName")}
                    placeholder="请输入你的昵称"
                    disabled={isProfileLoading}
                  />
                  <small>用于顶栏、头像菜单和任务归属提示。</small>
                </label>

                <label className="settings-field">
                  <span>头像地址</span>
                  <input
                    {...register("avatarUrl")}
                    placeholder="https://example.com/avatar.jpg"
                    disabled={isProfileLoading}
                  />
                  <small>建议使用稳定、可公开访问的图片地址。</small>
                </label>

                <div className="settings-field">
                  <span>账号邮箱</span>
                  <div className="settings-readonly-field">
                    <span>{profile?.email || user?.email || "暂无邮箱信息"}</span>
                    <b>已验证</b>
                  </div>
                  <small>邮箱用于登录和账号通知，暂不支持在此修改。</small>
                </div>
              </div>

              <div className="settings-form__footer">
                <span>最后一次修改会立即同步到当前工作区。</span>
                <button type="submit" disabled={isSubmitting || isProfileLoading}>
                  <span aria-hidden="true">↗</span>
                  {isSubmitting ? "保存中..." : "保存资料"}
                </button>
              </div>
            </form>

            <section className="settings-danger-zone">
              <div>
                <span className="settings-panel-kicker settings-panel-kicker--danger">会话管理</span>
                <p className="settings-danger-zone__title">退出当前账号</p>
                <p className="settings-danger-zone__description">
                  结束当前会话并返回登录页。
                </p>
              </div>
              <button type="button" onClick={handleSignOut} className="settings-signout-button">
                退出登录
              </button>
            </section>
          </section>
        </section>
      </section>
    </>
  );
}
