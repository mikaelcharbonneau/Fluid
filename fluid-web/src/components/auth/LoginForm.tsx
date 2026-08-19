"use client";

import { useState } from "react";
import Link from "next/link";
import { useMagnetic } from "@/components/interaction/useMagnetic";
import { AuthError } from "./AuthError";
import { PasswordField } from "./PasswordField";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const submitRef = useMagnetic<HTMLButtonElement>(0.3);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        window.location.assign("/app/home");
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
        <div className="fg">
          <label htmlFor="li-email">Email</label>
          <div className="fg-input">
            <input
              className="auth-input"
              id="li-email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>
        <PasswordField
          id="li-pw"
          label="Password"
          labelExtra={
            <Link className="label-link" href="/reset-password">
              Forgot?
            </Link>
          }
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          placeholder="Your password"
        />
        <button ref={submitRef} className="btn btn-block" type="submit" disabled={pending}>
          <span className="btn-label">Log in</span>
          <span className="arr">→</span>
        </button>
      </form>
      <AuthError message={error} />

      <p className="auth-alt">
        New to Fluid? <Link href="/signup">Create an account</Link>
      </p>
    </>
  );
}
