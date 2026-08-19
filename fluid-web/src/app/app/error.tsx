"use client";

import { useEffect } from "react";
import { reportError } from "@/lib/monitoring/log";
import { PrimaryAction, RecoveryPanel, SecondaryAction } from "@/components/recovery-panel";

// Product-specific error boundary for everything under /app. Brand work is
// autosaved server-side as each field/step changes (see src/lib/brands.ts +
// the brands API), so a retry here just re-mounts the client and re-fetches
// the brand from Supabase — it does not throw away anything the user hasn't
// already had saved, and doesn't wipe local, not-yet-submitted form input on
// its own (React only unmounts the tree that already crashed).
export default function AppError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    reportError("Unhandled error in the product", error, { digest: error.digest });
  }, [error]);

  return (
    <RecoveryPanel
      eyebrow="Fluid"
      title="The studio hit a snag"
      message="Something went wrong loading your brand workspace. Your saved progress is safe — try again, or head back to your brands."
      digest={error.digest}
      actions={
        <>
          <PrimaryAction onClick={unstable_retry}>Try again</PrimaryAction>
          <SecondaryAction href="/app">Back to your brands</SecondaryAction>
        </>
      }
    />
  );
}
