"use client";

import { signIn } from "next-auth/react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function SignInContent() {
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/";
  const error = params.get("error");

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
          <button type="button" onClick={() => signIn("github", { callbackUrl })}>
            Continue with GitHub
          </button>
          <button type="button" onClick={() => signIn("google", { callbackUrl })}>
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
