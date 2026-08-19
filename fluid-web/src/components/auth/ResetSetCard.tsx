import { ResetSetForm } from "./ResetSetForm";

export function ResetSetCard() {
  return (
    <>
      <span className="auth-eyebrow">Password reset</span>
      <h1 className="auth-title">Set a new password</h1>
      <p className="auth-sub">Choose a new password for your Fluid account. You&apos;ll be signed in right after.</p>

      <ResetSetForm />
    </>
  );
}
