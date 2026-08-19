import type { Metadata } from "next";
import { fragment } from "@/lib/fragment";
import { bootstrapScript } from "@/lib/client-script";
import "../styles/marketing.css";
import "../styles/auth.css";

export const metadata: Metadata = {
  title: "Fluid — Create your account",
  description: "Create your Fluid account and turn ideas into brand identities.",
};

export default function SignupPage() {
  return (
    <>
      {/* signup.js tracks the cursor (.cursor-ring/.cursor-dot style.transform)
          from the moment it loads, which usually wins the race against
          hydration — an intentional, expected difference from the static
          fragment; see src/app/page.tsx for the full explanation. */}
      <div dangerouslySetInnerHTML={{ __html: fragment("signup") }} suppressHydrationWarning />
      <script dangerouslySetInnerHTML={{ __html: bootstrapScript("/scripts/signup.js") }} />
    </>
  );
}
