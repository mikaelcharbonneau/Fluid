"use client";

import { useState } from "react";
import Link from "next/link";
import { useMagnetic } from "@/components/interaction/useMagnetic";
import { AuthError } from "./AuthError";

export function ResetRequestForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const submitRef = useMagnetic<HTMLButtonElement>(0.3);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email) {
      setError("Enter your email.");
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setSentTo(email);
        return;
      }
      setError(data?.error || "Something went wrong. Try again.");
      setPending(false);
    } catch {
      setError("Network error. Check your connection and try again.");
      setPending(false);
    }
  };

  if (sentTo) {
    return (
      <p className="auth-sub" style={{ marginTop: 10 }}>
        If an account exists for {sentTo}, a reset link is on its way. Check your inbox (and spam).
      </p>
    );
  }

  return (
    <>
      <form className="auth-fields" onSubmit={handleSubmit}>
        <div className="fg">
          <label htmlFor="rr-email">Email</label>
          <div className="fg-input">
            <input
              className="auth-input"
              id="rr-email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>
        <button ref={submitRef} className="btn btn-block" type="submit" disabled={pending}>
          <span className="btn-label">Send reset link</span>
          <span className="arr">→</span>
        </button>
      </form>
      <AuthError message={error} />

      <p className="auth-alt">
        Remembered it? <Link href="/login">Back to log in</Link>
      </p>
    </>
  );
}
