"use client";

import { useState } from "react";
import { useMagnetic } from "@/components/interaction/useMagnetic";

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
    <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z" />
  </svg>
);

const AppleIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="currentColor"
      d="M16.36 12.78c-.02-2.3 1.88-3.4 1.96-3.45-1.07-1.56-2.73-1.78-3.32-1.8-1.41-.14-2.76.83-3.48.83-.72 0-1.83-.81-3.01-.79-1.55.02-2.98.9-3.78 2.29-1.61 2.8-.41 6.94 1.15 9.21.76 1.11 1.67 2.36 2.86 2.31 1.15-.05 1.58-.74 2.97-.74 1.38 0 1.77.74 2.98.72 1.23-.02 2.01-1.13 2.76-2.25.87-1.29 1.23-2.54 1.25-2.6-.03-.01-2.4-.92-2.42-3.66Zm-2.3-6.72c.64-.78 1.07-1.85.95-2.93-.92.04-2.04.61-2.7 1.38-.59.69-1.11 1.79-.97 2.84 1.03.08 2.08-.52 2.72-1.29Z"
    />
  </svg>
);

// Google starts the real OAuth flow via /api/auth/oauth; Apple is not wired
// up server-side yet, so it just surfaces the "coming soon" toast — matching
// public/scripts/{login,signup,reset-password}.js exactly.
export function OAuthButtons({ toast }: { toast: (msg: string) => void }) {
  const [pending, setPending] = useState<"google" | null>(null);
  const googleRef = useMagnetic<HTMLButtonElement>(0.2);
  const appleRef = useMagnetic<HTMLButtonElement>(0.2);

  const handleGoogle = async () => {
    setPending("google");
    try {
      const res = await fetch("/api/auth/oauth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "google" }),
      });
      const data = await res.json();
      if (res.ok && data?.url) {
        window.location.assign(data.url);
        return;
      }
      toast(data?.error || "Couldn't start Google sign-in. Try again.");
      setPending(null);
    } catch {
      toast("Network error. Try again.");
      setPending(null);
    }
  };

  const handleApple = () => {
    toast("Apple sign-in is coming soon — use Google or email for now.");
  };

  return (
    <div className="oauth">
      <button
        ref={googleRef}
        className="oauth-btn"
        type="button"
        data-provider="google"
        onClick={handleGoogle}
        disabled={pending === "google"}
      >
        <GoogleIcon />
        Continue with Google
      </button>
      <button ref={appleRef} className="oauth-btn" type="button" data-provider="apple" onClick={handleApple}>
        <AppleIcon />
        Continue with Apple
      </button>
    </div>
  );
}
