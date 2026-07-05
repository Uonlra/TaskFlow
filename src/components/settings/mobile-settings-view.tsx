"use client";

import { useState } from "react";

type MobileSettingsViewProps = {
  displayName: string;
  email: string;
  avatarUrl?: string;
  isConfigured: boolean;
  onSignOut: () => void | Promise<void>;
};

type SettingItem = {
  icon: string;
  label: string;
  value?: string;
  control?: "toggle" | "arrow";
  enabled?: boolean;
};

export function MobileSettingsView({ displayName, email, avatarUrl, isConfigured, onSignOut }: MobileSettingsViewProps) {
  const [settings, setSettings] = useState({
    darkMode: false,
    notifications: true,
    calendar: false,
    backup: true,
  });

  const groups: Array<{ title: string; items: SettingItem[] }> = [
    {
      title: "外观",
      items: [
        { icon: "theme", label: "主题模式", value: settings.darkMode ? "深色" : "浅色", control: "toggle", enabled: settings.darkMode },
        { icon: "language", label: "语言", value: "简体中文", control: "arrow" },
      ],
    },
    {
      title: "任务",
      items: [
        { icon: "bell", label: "通知", control: "toggle", enabled: settings.notifications },
        { icon: "task", label: "任务偏好", value: "默认排序", control: "arrow" },
        { icon: "calendar", label: "日历同步", control: "toggle", enabled: settings.calendar },
      ],
    },
    {
      title: "数据",
      items: [
        { icon: "backup", label: "数据备份", control: "toggle", enabled: settings.backup },
        { icon: "lock", label: "隐私", control: "arrow" },
        { icon: "help", label: "帮助", control: "arrow" },
      ],
    },
  ];

  const handleToggle = (label: string) => {
    if (label === "主题模式") {
      setSettings((current) => ({ ...current, darkMode: !current.darkMode }));
    }

    if (label === "通知") {
      setSettings((current) => ({ ...current, notifications: !current.notifications }));
    }

    if (label === "日历同步") {
      setSettings((current) => ({ ...current, calendar: !current.calendar }));
    }

    if (label === "数据备份") {
      setSettings((current) => ({ ...current, backup: !current.backup }));
    }
  };

  return (
    <section className="mobile-settings" aria-label="移动端设置">
      <header className="mobile-settings__header">
        <div>
          <p>{isConfigured ? "已同步" : "本地模式"}</p>
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
        <button type="button" className="mobile-settings__profile-action" aria-label="编辑账号">
          <span aria-hidden="true" />
        </button>
      </section>

      {groups.map((group) => (
        <section key={group.title} className="mobile-settings__group" aria-label={group.title}>
          <h2>{group.title}</h2>
          <div className="mobile-settings__list">
            {group.items.map((item) => (
              <SettingRow key={item.label} item={item} onToggle={handleToggle} />
            ))}
          </div>
        </section>
      ))}

      <button type="button" className="mobile-settings__signout" onClick={onSignOut}>
        退出登录
      </button>
    </section>
  );
}

function SettingRow({ item, onToggle }: { item: SettingItem; onToggle: (label: string) => void }) {
  return (
    <div className="mobile-settings__row">
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