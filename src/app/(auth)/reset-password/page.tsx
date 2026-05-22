"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { validateCredentials } from "@/lib/auth/validation";

// Reached via the recovery link in the password-reset email. By the time this
// page loads, the link has passed through /auth/callback, which exchanged the
// recovery code for a session — so updateUser() acts on the authenticated user.
export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    const invalid = validateCredentials("update", { email: "", password, confirmPassword });
    if (invalid) {
      setError(invalid);
      return;
    }

    setPending(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setPending(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }
    setDone(true);
  };

  return (
    <main className="signin-shell">
      <div className="signin-card">
        <img className="signin-logo" src="/fluid-primary-wordmark.png" alt="Fluid." />
        <h1>Set a new password</h1>
        <p>Choose a new password for your account.</p>

        {error && (
          <div className="signin-error" role="alert">
            {error}
          </div>
        )}

        {done ? (
          <>
            <div className="signin-notice" role="status">
              Password updated.
            </div>
            <div className="signin-buttons">
              <Link className="brand-action" href="/">
                Continue
              </Link>
            </div>
          </>
        ) : (
          <form className="signin-form" onSubmit={onSubmit}>
            <label className="signin-field">
              <span>New password</span>
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            <label className="signin-field">
              <span>Confirm password</span>
              <input
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </label>
            <button type="submit" className="signin-submit" disabled={pending}>
              {pending ? "Please wait…" : "Update password"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
