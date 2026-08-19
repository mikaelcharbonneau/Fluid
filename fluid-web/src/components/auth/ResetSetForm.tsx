"use client";

import { useState } from "react";
import Link from "next/link";
import { useMagnetic } from "@/components/interaction/useMagnetic";
import { AuthError } from "./AuthError";
import { PasswordField } from "./PasswordField";

export function ResetSetForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const submitRef = useMagnetic<HTMLButtonElement>(0.3);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (res.ok) {
        window.location.assign("/app#home");
        return;
      }
      setError(data?.error || "Something went wrong. Try again.");
      setPending(false);
    } catch {
      setError("Network error. Check your connection and try again.");
      setPending(false);
    }
  };

  return (
    <>
      <form className="auth-fields" onSubmit={handleSubmit}>
        <PasswordField
          id="rs-pw"
          label="New password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          placeholder="At least 8 characters"
        />
        <button ref={submitRef} className="btn btn-block" type="submit" disabled={pending}>
          <span className="btn-label">Set new password</span>
          <span className="arr">→</span>
        </button>
      </form>
      <AuthError message={error} />

      <p className="auth-alt">
        <Link href="/login">Back to log in</Link>
      </p>
    </>
  );
}
