"use client";

import { useEffect } from "react";
import { reportError } from "@/lib/monitoring/log";
import { PrimaryAction, RecoveryPanel, SecondaryAction } from "@/components/recovery-panel";

// Isolates errors in the brand chat / canvas surface — a high-risk,
// generation-heavy surface — from the rest of the product. Without this,
// a crash here would bubble to the broader /app error boundary and blank
// navigation the user doesn't need to lose.
export default function ChatError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    reportError("Unhandled error in brand chat", error, { digest: error.digest });
  }, [error]);

  return (
    <RecoveryPanel
      eyebrow="Fluid"
      title="Chat hit an error"
      message="Something went wrong in the brand chat. Your brand's saved progress isn't affected — try again, or head back to your brands."
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
