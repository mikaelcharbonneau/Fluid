"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMagnetic } from "@/components/interaction/useMagnetic";
import { AuthError } from "./AuthError";
import { PasswordField } from "./PasswordField";

export function SignupForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const submitRef = useMagnetic<HTMLButtonElement>(0.3);

  // If the visitor arrived from a paid-plan CTA (/signup?plan=starter|pro),
  // remember it so the app can start checkout right after signup — works
  // for both email and Google sign-up, which return through different
  // paths. Matches public/scripts/signup.js exactly.
  useEffect(() => {
    try {
      const planParam = new URLSearchParams(window.location.search).get("plan");
      if (planParam === "starter" || planParam === "pro") {
        localStorage.setItem("fluid_intended_plan", planParam);
      }
    } catch {
      // private mode / storage disabled — just skip the upsell
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (res.ok && data?.needsConfirm) {
        setError("Almost there — check your email to confirm your account, then log in.");
        setPending(false);
        return;
      }
      if (res.ok) {
        window.location.assign("/app#step1");
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
          <label htmlFor="su-name">Full name</label>
          <div className="fg-input">
            <input
              className="auth-input"
              id="su-name"
              type="text"
              autoComplete="name"
              placeholder="Ada Lovelace"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        </div>
        <div className="fg">
          <label htmlFor="su-email">Work email</label>
          <div className="fg-input">
            <input
              className="auth-input"
              id="su-email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>
        <PasswordField
          id="su-pw"
          label="Password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          placeholder="At least 8 characters"
        />
        <button ref={submitRef} className="btn btn-block" type="submit" disabled={pending}>
          <span className="btn-label">Create account</span>
          <span className="arr">→</span>
        </button>
      </form>
      <AuthError message={error} />

      <p className="auth-fine">
        By creating an account you agree to Fluid&apos;s <Link href="/terms">Terms of Service</Link> and{" "}
        <Link href="/privacy">Privacy Policy</Link>.
      </p>
      <p className="auth-alt">
        Already have an account? <Link href="/login">Log in</Link>
      </p>
    </>
  );
}
