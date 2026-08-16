"use client";

import { useId, useState } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";

type AuthInputProps = {
  label: string;
  type: "email" | "password" | "text";
  placeholder: string;
  error?: string;
  registration: UseFormRegisterReturn;
  icon: string;
};

export function AuthInput({ label, type, placeholder, error, registration, icon }: AuthInputProps) {
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
        <input id={inputId} type={inputType} placeholder={placeholder} {...registration} className="auth-input" />
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
      {error ? <span className="auth-input-error">{error}</span> : null}
    </div>
  );
}
