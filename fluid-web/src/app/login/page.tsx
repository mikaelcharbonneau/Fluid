import type { Metadata } from "next";
import { fragment } from "@/lib/fragment";
import { bootstrapScript } from "@/lib/client-script";
import "../styles/marketing.css";
import "../styles/auth.css";

export const metadata: Metadata = {
  title: "Fluid — Log in",
  description: "Log in to your Fluid account.",
};

export default function LoginPage() {
  return (
    <>
      {/* login.js tracks the cursor (.cursor-ring/.cursor-dot style.transform)
          from the moment it loads, which usually wins the race against
          hydration — an intentional, expected difference from the static
          fragment; see src/app/page.tsx for the full explanation. */}
      <div dangerouslySetInnerHTML={{ __html: fragment("login") }} suppressHydrationWarning />
      <script dangerouslySetInnerHTML={{ __html: bootstrapScript("/scripts/login.js") }} />
    </>
  );
}
