import Script from "next/script";
import type { Metadata } from "next";
import { fragment } from "@/lib/fragment";
import "../styles/marketing.css";
import "../styles/auth.css";

export const metadata: Metadata = {
  title: "Fluid — Create your account",
  description: "Create your Fluid account and turn ideas into brand identities.",
};

export default function SignupPage() {
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: fragment("signup") }} />
      <Script src="/scripts/signup.js" strategy="afterInteractive" />
    </>
  );
}
