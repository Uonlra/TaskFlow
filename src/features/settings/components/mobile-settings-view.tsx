"use client";

import { useEffect, useState, type ReactNode } from "react";

import type { Profile, ProfileFormValues } from "@/features/auth/types/profile.types";
import { useTaskStore } from "@/features/tasks/store/task-store";
import { useToast } from "@/shared/providers/toast-provider";

type MobileSettingsViewProps = {
  displayName: string;
  email: string;
  avatarUrl?: string;
  isConfigured: boolean;
  isProfileLoading: boolean;
  onSaveProfile: (values: ProfileFormValues) => Promise<Profile | null>;
  onSignOut: () => void | Promise<void>;
};

type SettingItem = {
  icon: string;
  label: string;
  value?: string;
  control?: "toggle" | "arrow";
  enabled?: boolean;
};

type MobileSettings = {
  darkMode: boolean;
  notifications: boolean;
  calendar: boolean;
  language: "简体中文" | "English";
  taskSort: "默认排序" | "截止日期优先" | "优先级优先";
};

const SETTINGS_STORAGE_KEY = "u-task-settings";
const defaultSettings: MobileSettings = {
  darkMode: false,
  notifications: true,
  calendar: false,
  language: "简体中文",
  taskSort: "默认排序",
};

export function MobileSettingsView({
  displayName,
  email,
  avatarUrl,
  isConfigured,
  isProfileLoading,
  onSaveProfile,
  onSignOut,
}: MobileSettingsViewProps) {
  const tasks = useTaskStore((state) => state.tasks);
  const { showToast } = useToast();
  const [settings, setSettings] = useState<MobileSettings>(defaultSettings);
  const [isReady, setIsReady] = useState(false);
  const [activeDialog, setActiveDialog] = useState<"profile" | "language" | "tasks" | "privacy" | "help" | null>(null);
  const [profileForm, setProfileForm] = useState<ProfileFormValues>({
    fullName: displayName,
    avatarUrl: avatarUrl ?? "",
  });

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) setSettings({ ...defaultSettings, ...JSON.parse(saved) });
      document.documentElement.dataset.theme = saved && JSON.parse(saved).darkMode ? "dark" : "light";
    } catch {
      // Ignore malformed or unavailable local storage and keep defaults.
    }
    setIsReady(true);
  }, []);

  const updateSettings = (next: MobileSettings) => {
    setSettings(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
      document.documentElement.dataset.theme = next.darkMode ? "dark" : "light";
    }
  };

  const groups: Array<{ title: string; items: SettingItem[] }> = [
    {
      title: "外观",
      items: [
        {
          icon: "theme",
          label: "主题模式",
          value: settings.darkMode ? "深色" : "浅色",
          control: "toggle",
          enabled: settings.darkMode,
        },
        { icon: "language", label: "语言", value: settings.language, control: "arrow" },
      ],
    },
    {
      title: "任务",
      items: [
        { icon: "bell", label: "通知", control: "toggle", enabled: settings.notifications },
        { icon: "task", label: "任务偏好", value: settings.taskSort, control: "arrow" },
        { icon: "calendar", label: "日历同步", control: "toggle", enabled: settings.calendar },
      ],
    },
    {
      title: "数据",
      items: [
        { icon: "backup", label: "数据备份", value: "导出", control: "arrow" },
        { icon: "lock", label: "隐私", control: "arrow" },
        { icon: "help", label: "帮助", control: "arrow" },
      ],
    },
  ];

  const handleToggle = (label: string) => {
    const key: Record<string, keyof Pick<MobileSettings, "darkMode" | "notifications" | "calendar">> = {
      主题模式: "darkMode",
      通知: "notifications",
      日历同步: "calendar",
    };
    const settingKey = key[label];
    if (settingKey) updateSettings({ ...settings, [settingKey]: !settings[settingKey] });
  };

  const handleRowAction = (label: string) => {
    if (label === "语言" || label === "任务偏好" || label === "隐私" || label === "帮助") {
      setActiveDialog(
        label === "语言" ? "language" : label === "任务偏好" ? "tasks" : label === "隐私" ? "privacy" : "help",
      );
    }
    if (label === "数据备份") exportBackup();
  };

  const exportBackup = () => {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), tasks }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `u-task-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast({ title: "备份已导出", description: `已导出 ${tasks.length} 条任务。`, tone: "success" });
  };

  const saveMobileProfile = async () => {
    try {
      await onSaveProfile(profileForm);
      setActiveDialog(null);
      showToast({ title: "资料已保存", description: "你的个人信息已经更新。", tone: "success" });
    } catch (error) {
      showToast({
        title: "资料更新失败",
        description: error instanceof Error ? error.message : "请稍后再试。",
        tone: "error",
      });
    }
  };

  return (
    <section className="mobile-settings" aria-label="移动端设置">
      <header className="mobile-page-header mobile-settings__header">
        <div className="mobile-page-header__copy">
          <p>{isConfigured ? "已登录" : "未登录"}</p>
          <h1>设置</h1>
        </div>
      </header>

      <section className="mobile-settings__profile" aria-label="账号">
        <div className="mobile-settings__avatar">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt={displayName} />
          ) : (
            <span>{displayName.slice(0, 1).toUpperCase()}</span>
          )}
        </div>
        <div className="mobile-settings__profile-copy">
          <strong>{displayName}</strong>
          <span>{email}</span>
        </div>
        <button
          type="button"
          className="mobile-settings__profile-action"
          aria-label="编辑账号"
          onClick={() => {
            setProfileForm({ fullName: displayName, avatarUrl: avatarUrl ?? "" });
            setActiveDialog("profile");
          }}
        >
          <span aria-hidden="true" />
        </button>
      </section>

      {groups.map((group) => (
        <section key={group.title} className="mobile-settings__group" aria-label={group.title}>
          <h2>{group.title}</h2>
          <div className="mobile-settings__list">
            {group.items.map((item) => (
              <SettingRow key={item.label} item={item} onToggle={handleToggle} onAction={handleRowAction} />
            ))}
          </div>
        </section>
      ))}

      <button type="button" className="mobile-settings__signout" onClick={onSignOut}>
        退出登录
      </button>
      {isReady && activeDialog ? (
        <SettingsDialog
          title={
            activeDialog === "profile"
              ? "编辑账号"
              : activeDialog === "language"
                ? "语言"
                : activeDialog === "tasks"
                  ? "任务偏好"
                  : activeDialog === "privacy"
                    ? "隐私"
                    : "帮助"
          }
          onClose={() => setActiveDialog(null)}
        >
          {activeDialog === "profile" ? (
            <div className="mobile-settings__dialog-form">
              <label>
                姓名
                <input
                  value={profileForm.fullName}
                  onChange={(event) => setProfileForm({ ...profileForm, fullName: event.target.value })}
                />
              </label>
              <label>
                头像地址
                <input
                  value={profileForm.avatarUrl}
                  onChange={(event) => setProfileForm({ ...profileForm, avatarUrl: event.target.value })}
                />
              </label>
              <button type="button" onClick={saveMobileProfile} disabled={isProfileLoading}>
                {isProfileLoading ? "保存中..." : "保存资料"}
              </button>
            </div>
          ) : activeDialog === "language" ? (
            <div className="mobile-settings__dialog-options">
              {(["简体中文", "English"] as const).map((language) => (
                <button
                  key={language}
                  type="button"
                  className={settings.language === language ? "is-selected" : ""}
                  onClick={() => {
                    updateSettings({ ...settings, language });
                    document.documentElement.lang = language === "English" ? "en" : "zh-CN";
                    setActiveDialog(null);
                  }}
                >
                  {language}
                </button>
              ))}
            </div>
          ) : activeDialog === "tasks" ? (
            <div className="mobile-settings__dialog-options">
              {(["默认排序", "截止日期优先", "优先级优先"] as const).map((taskSort) => (
                <button
                  key={taskSort}
                  type="button"
                  className={settings.taskSort === taskSort ? "is-selected" : ""}
                  onClick={() => {
                    updateSettings({ ...settings, taskSort });
                    setActiveDialog(null);
                  }}
                >
                  {taskSort}
                </button>
              ))}
            </div>
          ) : activeDialog === "privacy" ? (
            <p>你的设置保存在当前浏览器中。任务和个人资料仅通过已配置的账号服务同步。</p>
          ) : (
            <p>
              U&apos;s Task 是一个用于记录、整理和推进个人任务的小工具。你可以在任务页创建任务，在日历和统计页查看进度。
            </p>
          )}
        </SettingsDialog>
      ) : null}
    </section>
  );
}

function SettingRow({
  item,
  onToggle,
  onAction,
}: {
  item: SettingItem;
  onToggle: (label: string) => void;
  onAction: (label: string) => void;
}) {
  return (
    <div
      className="mobile-settings__row"
      role={item.control === "arrow" ? "button" : undefined}
      tabIndex={item.control === "arrow" ? 0 : undefined}
      onClick={() => item.control === "arrow" && onAction(item.label)}
      onKeyDown={(event) => {
        if (item.control === "arrow" && (event.key === "Enter" || event.key === " ")) onAction(item.label);
      }}
    >
      <span className={`mobile-settings__icon mobile-settings__icon--${item.icon}`} aria-hidden="true" />
      <span className="mobile-settings__row-label">{item.label}</span>
      {item.value ? <span className="mobile-settings__row-value">{item.value}</span> : null}
      {item.control === "toggle" ? (
        <button
          type="button"
          className={item.enabled ? "mobile-settings__toggle is-on" : "mobile-settings__toggle"}
          aria-label={`切换${item.label}`}
          aria-pressed={item.enabled}
          onClick={() => onToggle(item.label)}
        >
          <span />
        </button>
      ) : (
        <span className="mobile-settings__arrow" aria-hidden="true" />
      )}
    </div>
  );
}

function SettingsDialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="mobile-settings__dialog-backdrop" role="presentation" onClick={onClose}>
      <section
        className="mobile-settings__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-settings-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mobile-settings__dialog-header">
          <h2 id="mobile-settings-dialog-title">{title}</h2>
          <button type="button" aria-label="关闭" onClick={onClose}>
            ×
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
