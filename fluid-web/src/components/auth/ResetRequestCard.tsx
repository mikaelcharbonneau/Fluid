import { ResetRequestForm } from "./ResetRequestForm";

export function ResetRequestCard() {
  return (
    <>
      <span className="auth-eyebrow">Password reset</span>
      <h1 className="auth-title">Reset your password</h1>
      <p className="auth-sub">Enter your account email and we&apos;ll send you a link to set a new password.</p>

      <ResetRequestForm />
    </>
  );
}
