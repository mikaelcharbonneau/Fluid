"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function SignInContent() {
  const params = useSearchParams();
  const redirectTo = params.get("redirectTo") ?? "/";
  const error = params.get("error");

  const signInWith = async (provider: "github" | "google") => {
    const supabase = createClient();
    const callback = new URL("/auth/callback", window.location.origin);
    callback.searchParams.set("redirectTo", redirectTo);
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: callback.toString() },
    });
  };

  return (
    <main className="signin-shell">
      <div className="signin-card">
        <img className="signin-logo" src="/fluid-primary-wordmark.png" alt="Fluid." />
        <h1>Sign in to Fluid</h1>
        <p>Create and save AI-guided brand identities.</p>

        {error && (
          <div className="signin-error" role="alert">
            Sign-in failed. Please try again.
          </div>
        )}

        <div className="signin-buttons">
          <button type="button" onClick={() => signInWith("github")}>
            Continue with GitHub
          </button>
          <button type="button" onClick={() => signInWith("google")}>
            Continue with Google
          </button>
        </div>
      </div>
    </main>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInContent />
    </Suspense>
  );
}
