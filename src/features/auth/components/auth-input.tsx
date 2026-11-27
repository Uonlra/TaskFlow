"use client";

import { useId, useState, type ReactNode } from "react";
import { Eye, EyeOff, LockKeyhole, Mail, UserRound } from "lucide-react";
import type { UseFormRegisterReturn } from "react-hook-form";

type AuthInputProps = {
  label: string;
  type: "email" | "password" | "text";
  autoComplete: string;
  placeholder: string;
  error?: string;
  registration: UseFormRegisterReturn;
  supportingContent?: ReactNode;
};

export function AuthInput({
  label,
  type,
  autoComplete,
  placeholder,
  error,
  registration,
  supportingContent,
}: AuthInputProps) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";
  const Icon = isPassword ? LockKeyhole : type === "email" ? Mail : UserRound;
  const ToggleIcon = visible ? EyeOff : Eye;
  const feedback = error || supportingContent;
  return (
    <div className="auth-field">
      <label htmlFor={id}>{label}</label>
      <div className="auth-control" data-invalid={Boolean(error)}>
        <Icon size={17} aria-hidden="true" />
        <input
          {...registration}
          id={id}
          type={isPassword && visible ? "text" : type}
          autoComplete={autoComplete}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={feedback ? id + "-hint" : undefined}
        />
        {isPassword && (
          <button
            type="button"
            aria-label={visible ? "隐藏密码" : "显示密码"}
            aria-pressed={visible}
            onClick={() => setVisible(!visible)}
          >
            <ToggleIcon size={18} aria-hidden="true" />
          </button>
        )}
      </div>
      {feedback && (
        <div id={id + "-hint"} className={error ? "auth-error" : "auth-hint"} aria-live="polite">
          {feedback}
        </div>
      )}
    </div>
  );
}
