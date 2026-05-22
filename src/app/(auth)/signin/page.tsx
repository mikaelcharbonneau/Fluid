"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { validateCredentials } from "@/lib/auth/validation";
import { createClient } from "@/lib/supabase/client";

function ChevronDown() {
  return (
    <svg className="login-nav-chevron" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M4.5 6.25L8 9.75L11.5 6.25" />
    </svg>
  );
}

function EyeGlyph() {
  return (
    <svg className="login-eye-icon" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M2.7 10C4.45 7.05 6.9 5.55 10 5.55C13.1 5.55 15.55 7.05 17.3 10C15.55 12.95 13.1 14.45 10 14.45C6.9 14.45 4.45 12.95 2.7 10Z" />
      <path d="M8.15 10A1.85 1.85 0 1 0 11.85 10A1.85 1.85 0 0 0 8.15 10Z" />
    </svg>
  );
}

function ArrowRight() {
  return (
    <svg className="login-arrow-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4.75 12H18.25M13.25 6.75L18.5 12L13.25 17.25" />
    </svg>
  );
}

function GoogleGlyph() {
  return (
    <svg className="login-provider-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.76-.07-1.48-.2-2.18H12v4.13h5.38a4.6 4.6 0 0 1-2 3.02v2.68h3.24c1.9-1.75 2.98-4.32 2.98-7.65Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.98-.9 6.62-2.43l-3.24-2.68c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.77-5.61-4.14H3.03v2.77A9.99 9.99 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.39 13.71A6.02 6.02 0 0 1 6.07 12c0-.59.11-1.16.32-1.71V7.52H3.03A9.99 9.99 0 0 0 2 12c0 1.61.38 3.13 1.03 4.48l3.36-2.77Z"
      />
      <path
        fill="#EA4335"
        d="M12 6.15c1.47 0 2.78.5 3.82 1.5l2.87-2.87C16.97 3.17 14.7 2.2 12 2.2A9.99 9.99 0 0 0 3.03 7.52l3.36 2.77C7.18 7.92 9.39 6.15 12 6.15Z"
      />
    </svg>
  );
}

function AppleGlyph() {
  return (
    <svg className="login-provider-icon login-provider-icon-apple" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M16.6 12.75c-.02-2.34 1.9-3.48 1.99-3.53-1.1-1.6-2.8-1.82-3.39-1.84-1.44-.15-2.82.85-3.55.85-.75 0-1.89-.83-3.11-.8-1.6.03-3.08.93-3.9 2.36-1.68 2.91-.43 7.2 1.19 9.55.8 1.15 1.74 2.44 2.98 2.39 1.2-.05 1.65-.77 3.1-.77 1.43 0 1.83.77 3.09.74 1.28-.02 2.08-1.16 2.85-2.32.91-1.32 1.28-2.61 1.3-2.68-.03-.01-2.52-.97-2.55-3.95ZM14.26 5.86c.65-.79 1.08-1.88.96-2.96-.93.04-2.08.62-2.75 1.4-.6.69-1.13 1.81-.99 2.87 1.05.08 2.12-.53 2.78-1.31Z" />
    </svg>
  );
}

function FeatureSpark() {
  return (
    <svg className="login-feature-icon login-feature-spark" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3.5L13.85 9.25L19.5 11.2L13.85 13.15L12 19L10.15 13.15L4.5 11.2L10.15 9.25L12 3.5Z" />
      <path d="M18.5 3.75L19.25 6L21.5 6.75L19.25 7.5L18.5 9.75L17.75 7.5L15.5 6.75L17.75 6L18.5 3.75Z" />
    </svg>
  );
}

function FeatureLayers() {
  return (
    <svg className="login-feature-icon login-feature-layers" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 4.2L20 8.35L12 12.5L4 8.35L12 4.2Z" />
      <path d="M5.6 12.2L12 15.55L18.4 12.2" />
      <path d="M5.6 15.95L12 19.3L18.4 15.95" />
    </svg>
  );
}

function FeatureBolt() {
  return (
    <svg className="login-feature-icon login-feature-bolt" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M13.25 2.9L5.7 13.35H11.3L10.75 21.1L18.3 10.55H12.7L13.25 2.9Z" />
    </svg>
  );
}

function SignInContent() {
  const params = useSearchParams();
  const redirectTo = params.get("redirectTo") ?? "/";
  const error = params.get("error");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [formMessage, setFormMessage] = useState<string | null>(null);

  const signInWith = async (provider: "google" | "apple") => {
    const supabase = createClient();
    const callback = new URL("/auth/callback", window.location.origin);
    callback.searchParams.set("redirectTo", redirectTo);
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: callback.toString() },
    });
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormMessage(null);

    const invalid = validateCredentials("signin", { email, password });
    if (invalid) {
      setFormMessage(invalid);
      return;
    }

    setPending(true);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setPending(false);

    if (signInError) {
      setFormMessage(signInError.message);
      return;
    }

    window.location.assign(redirectTo);
  };

  const onForgotPassword = async () => {
    setFormMessage(null);

    if (!email.trim()) {
      setFormMessage("Enter your email address first.");
      return;
    }

    const supabase = createClient();
    const callback = new URL("/reset-password", window.location.origin);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: callback.toString(),
    });

    setFormMessage(resetError ? resetError.message : "Password reset link sent.");
  };

  return (
    <main className="login-page">
      <header className="login-header" aria-label="Main navigation">
        <Link className="login-logo-link" href="/" aria-label="Fluid home">
          <img src="/fluid-primary-wordmark.png" alt="Fluid." />
        </Link>

        <nav className="login-nav" aria-label="Primary">
          <Link href="/">Home</Link>
          <Link href="/">How it works</Link>
          <Link href="/" className="login-nav-disclosure">
            Products <ChevronDown />
          </Link>
          <Link href="/" className="login-nav-disclosure">
            Portfolio <ChevronDown />
          </Link>
          <Link href="/">Pricing</Link>
        </nav>

        <div className="login-header-actions">
          <Link href="/signin">Log in</Link>
          <Link className="login-start-button" href="/">
            Start creating
          </Link>
        </div>
      </header>

      <section className="login-form-column" aria-label="Log in">
        <p className="login-kicker">Welcome back</p>
        <h1>
          Log in to
          <br />
          your <span>account</span>
        </h1>
        <p className="login-lead">
          Access your projects, branding kit
          <br />
          and creative dashboard.
        </p>

        {(error || formMessage) && (
          <div className="login-message" role={error || formMessage?.includes("failed") ? "alert" : "status"}>
            {formMessage ?? "Sign-in failed. Please try again."}
          </div>
        )}

        <form className="login-form" onSubmit={onSubmit}>
          <div className="login-field">
            <label htmlFor="login-email">Email address</label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder="name@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div className="login-field">
            <label htmlFor="login-password">Password</label>
            <span className="login-password-wrap">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                <EyeGlyph />
              </button>
            </span>
          </div>

          <div className="login-form-options">
            <label className="login-checkbox">
              <input
                type="checkbox"
                checked={remember}
                onChange={(event) => setRemember(event.target.checked)}
              />
              <span>Remember me</span>
            </label>
            <button type="button" onClick={onForgotPassword}>
              Forgot password?
            </button>
          </div>

          <button type="submit" className="login-submit" disabled={pending}>
            <span>{pending ? "Logging in" : "Log in"}</span>
            <ArrowRight />
          </button>
        </form>

        <div className="login-divider">
          <span>Or continue with</span>
        </div>

        <div className="login-provider-buttons">
          <button type="button" onClick={() => signInWith("google")}>
            <GoogleGlyph />
            <span>Continue with Google</span>
          </button>
          <button type="button" onClick={() => signInWith("apple")}>
            <AppleGlyph />
            <span>Continue with Apple</span>
          </button>
        </div>

        <p className="login-signup">
          Don&apos;t have an account? <Link href="/">Sign up</Link>
        </p>
      </section>

      <section className="login-brand-stage" aria-label="Fluid brand system">
        <img className="login-ribbon-art" src="/login-ribbon-art.png" alt="" aria-hidden="true" />

        <div className="login-brand-copy">
          <h2>
            Your brand.
            <br />
            Designed to flow.
          </h2>
          <p>
            All the tools you need to create
            <br />a brand that&apos;s adaptable, consistent
            <br />
            and built to leave a lasting impact.
          </p>
        </div>

        <div className="login-feature-row" aria-label="Fluid benefits">
          <article>
            <FeatureSpark />
            <h3>AI-Powered</h3>
            <p>
              Smart ideas,
              <br />
              better brands.
            </p>
          </article>
          <article>
            <FeatureLayers />
            <h3>On-Brand</h3>
            <p>
              Always consistent,
              <br />
              every time.
            </p>
          </article>
          <article>
            <FeatureBolt />
            <h3>Founder-Focused</h3>
            <p>
              Built for speed,
              <br />
              made for impact.
            </p>
          </article>
        </div>
      </section>
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
