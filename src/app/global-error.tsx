"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main className="signin-shell">
          <div className="signin-card">
            <h1>Something went wrong</h1>
            <p>An unexpected error occurred. Please try again.</p>
            <div className="signin-buttons">
              <button type="button" onClick={() => reset()}>
                Try again
              </button>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
