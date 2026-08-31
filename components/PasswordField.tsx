"use client";

import { useState, type ReactNode } from "react";
import { getPasswordStrength } from "@/lib/passwordStrength";

export function PasswordField({
  label,
  value,
  onChange,
  placeholder,
  autoComplete,
  minLength,
  required = true,
  extraLabel,
  showStrength = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  minLength?: number;
  required?: boolean;
  extraLabel?: ReactNode;
  showStrength?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const strength = showStrength ? getPasswordStrength(value) : null;

  return (
    <label className="block text-sm font-medium text-base-content">
      <span className="flex items-center justify-between">
        {label}
        {extraLabel}
      </span>
      <div className="relative mt-1.5">
        <input
          type={visible ? "text" : "password"}
          required={required}
          minLength={minLength}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="input input-bordered w-full pr-10"
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-base-content/50 hover:text-base-content"
          aria-label={visible ? "Hide password" : "Show password"}
          tabIndex={-1}
        >
          {visible ? (
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 3l18 18M10.58 10.58a2 2 0 002.83 2.83M9.88 4.24A9.53 9.53 0 0112 4c5 0 9 4 10.5 8-.5 1.42-1.36 2.9-2.53 4.19M6.6 6.6C4.4 8.06 2.9 10 1.5 12c1.5 4 5.5 8 10.5 8 1.3 0 2.53-.27 3.66-.75"
              />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M1.5 12S5.5 4 12 4s10.5 8 10.5 8-4 8-10.5 8S1.5 12 1.5 12z"
              />
              <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </div>
      {strength && (
        <div className="mt-1.5 flex items-center gap-2">
          <div className="flex flex-1 gap-1">
            {[1, 2, 3, 4].map((segment) => (
              <span
                key={segment}
                className={`h-1.5 flex-1 rounded-full ${segment <= strength.score ? strength.colorClass : "bg-base-300"}`}
              />
            ))}
          </div>
          <span className="text-xs font-medium text-base-content/60">{strength.label}</span>
        </div>
      )}
    </label>
  );
}
