"use client";

import { useEffect } from "react";
import { reportError } from "@/lib/monitoring/log";

// Catches errors that escape the root layout itself — the last resort
// before a truly blank page. Per Next's convention this replaces <html>/
// <body> entirely and does NOT receive the app's global stylesheets, so
// everything here is self-contained inline styles.
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    reportError("Unhandled error escaped the root layout", error, { digest: error.digest });
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          background: "#FAFAFB",
          color: "#000",
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
          textAlign: "center",
        }}
      >
        <div style={{ width: "min(440px, 100%)" }}>
          <p
            style={{
              margin: "0 0 8px",
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: "rgba(0,0,0,0.72)",
            }}
          >
            Fluid
          </p>
          <h1 style={{ margin: "0 0 12px", fontSize: 28, fontWeight: 600, lineHeight: 1.2 }}>
            Something went wrong
          </h1>
          <p style={{ margin: "0 0 28px", fontSize: 16, lineHeight: 1.5, color: "rgba(0,0,0,0.72)" }}>
            The app hit an unexpected error and couldn&apos;t recover on its own. It&apos;s been
            reported — reloading usually fixes this.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={unstable_retry}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "12px 20px",
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
                border: "1px solid #000",
                background: "#000",
                color: "#fff",
              }}
            >
              Try again
            </button>
            {/* A plain hard navigation, not next/link: this fallback is what
                renders when something as fundamental as a chunk load has
                already failed, so it shouldn't depend on the client router
                being in a working state to get the user out. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "12px 20px",
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 600,
                textDecoration: "none",
                border: "1px solid #000",
                background: "transparent",
                color: "#000",
              }}
            >
              Back to Home
            </a>
          </div>
          {error.digest && (
            <p style={{ marginTop: 24, fontSize: 12, color: "rgba(0,0,0,0.5)" }}>
              Reference: <code>{error.digest}</code>
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
