import type { Metadata } from "next";
import { RecoveryPanel, PrimaryAction, SecondaryAction } from "@/components/recovery-panel";

export const metadata: Metadata = {
  title: "Fluid — Page not found",
};

export default function NotFound() {
  return (
    <RecoveryPanel
      eyebrow="404"
      title="We couldn't find that page"
      message="The page you're looking for doesn't exist or may have moved."
      actions={
        <>
          <PrimaryAction href="/">Back to Home</PrimaryAction>
          <SecondaryAction href="/app">Go to your brands</SecondaryAction>
        </>
      }
    />
  );
}
