"use client";

import { useId, useState } from "react";
import type { FocusEventHandler, ReactNode } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";

type AuthInputProps = {
  label: string;
  type: "email" | "password" | "text";
  placeholder: string;
  error?: string;
  registration: UseFormRegisterReturn;
  icon: string;
  onFocus?: FocusEventHandler<HTMLInputElement>;
  supportingContent?: ReactNode;
};

export function AuthInput({
  label,
  type,
  placeholder,
  error,
  registration,
  icon,
  onFocus,
  supportingContent,
}: AuthInputProps) {
  const inputId = useId();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword && isPasswordVisible ? "text" : type;

  return (
    <div className="auth-input-field">
      <label className="auth-input-label" htmlFor={inputId}>
        {label}
      </label>
      <div className={`auth-input-shell${error ? " auth-input-shell--error" : ""}`}>
        <span className="auth-input-icon" aria-hidden="true">
          {icon}
        </span>
        <input
          id={inputId}
          type={inputType}
          placeholder={placeholder}
          {...registration}
          className="auth-input"
          onFocus={onFocus}
        />
        {isPassword ? (
          <button
            type="button"
            className={`auth-password-toggle${isPasswordVisible ? " auth-password-toggle--active" : ""}`}
            aria-label={isPasswordVisible ? "隐藏密码" : "显示密码"}
            aria-pressed={isPasswordVisible}
            onClick={() => setIsPasswordVisible((current) => !current)}
          >
            <span className="auth-password-eye" aria-hidden="true" />
          </button>
        ) : null}
      </div>
      {supportingContent}
      {error ? <span className="auth-input-error">{error}</span> : null}
    </div>
  );
}
