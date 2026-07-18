import Script from "next/script";
import type { Metadata } from "next";
import { fragment } from "@/lib/fragment";
import "../styles/marketing.css";
import "../styles/auth.css";

export const metadata: Metadata = {
  title: "Fluid — Log in",
  description: "Log in to your Fluid account.",
};

export default function LoginPage() {
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: fragment("login") }} />
      <Script src="/scripts/login.js" strategy="afterInteractive" />
    </>
  );
}
