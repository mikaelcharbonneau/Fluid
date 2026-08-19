"use client";

import { useToast } from "./useToast";
import { Toast } from "./Toast";
import { OAuthButtons } from "./OAuthButtons";
import { LoginForm } from "./LoginForm";

export function LoginCard() {
  const { message, visible, toast } = useToast();

  return (
    <>
      <span className="auth-eyebrow">Welcome back</span>
      <h1 className="auth-title">Log in to Fluid</h1>
      <p className="auth-sub">Pick up where you left off — your brands, kits and exports are waiting.</p>

      <OAuthButtons toast={toast} />

      <div className="auth-divider">or log in with email</div>

      <LoginForm />

      <Toast message={message} visible={visible} />
    </>
  );
}
