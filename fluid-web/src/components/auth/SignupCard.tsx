"use client";

import { useToast } from "./useToast";
import { Toast } from "./Toast";
import { OAuthButtons } from "./OAuthButtons";
import { SignupForm } from "./SignupForm";

export function SignupCard() {
  const { message, visible, toast } = useToast();

  return (
    <>
      <span className="auth-eyebrow">Get started — free</span>
      <h1 className="auth-title">Create your account</h1>
      <p className="auth-sub">
        Type one sentence. Leave with a complete brand — strategy, naming, logo, palette and guidelines.
      </p>

      <OAuthButtons toast={toast} />

      <div className="auth-divider">or sign up with email</div>

      <SignupForm />

      <Toast message={message} visible={visible} />
    </>
  );
}
