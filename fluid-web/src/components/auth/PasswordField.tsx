"use client";

import { useId, useState } from "react";

const EyeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1.8 12S5.5 5 12 5s10.2 7 10.2 7-3.7 7-10.2 7S1.8 12 1.8 12Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export function PasswordField({
  label,
  labelExtra,
  value,
  onChange,
  autoComplete,
  placeholder,
  id,
}: {
  label: string;
  labelExtra?: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
  placeholder: string;
  id?: string;
}) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [show, setShow] = useState(false);

  return (
    <div className="fg">
      <label className={labelExtra ? "label-row" : undefined} htmlFor={inputId}>
        {label}
        {labelExtra}
      </label>
      <div className="fg-input">
        <input
          className="auth-input"
          id={inputId}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          className="pw-toggle"
          type="button"
          aria-label={show ? "Hide password" : "Show password"}
          onClick={() => setShow((s) => !s)}
        >
          <EyeIcon />
        </button>
      </div>
    </div>
  );
}
