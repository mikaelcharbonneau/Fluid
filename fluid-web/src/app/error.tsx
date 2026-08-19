"use client";

import { useEffect } from "react";
import { reportError } from "@/lib/monitoring/log";
import { PrimaryAction, RecoveryPanel, SecondaryAction } from "@/components/recovery-panel";

// Catches render errors on the marketing, auth, and legal pages (everything
// under the root layout that isn't /app — the product has its own
// error.tsx with product-specific recovery copy).
export default function RootError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    reportError("Unhandled error on a public page", error, { digest: error.digest });
  }, [error]);

  return (
    <RecoveryPanel
      eyebrow="Fluid"
      title="Something went wrong"
      message="This page hit an unexpected error. It's been reported — try again, or head back home."
      digest={error.digest}
      actions={
        <>
          <PrimaryAction onClick={unstable_retry}>Try again</PrimaryAction>
          <SecondaryAction href="/">Back to Home</SecondaryAction>
        </>
      }
    />
  );
}
