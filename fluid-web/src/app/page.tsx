import Script from "next/script";
import type { Metadata } from "next";
import { fragment } from "@/lib/fragment";
import "./styles/marketing.css";

export const metadata: Metadata = {
  title: "Fluid — From idea to identity",
  description:
    "Your idea enters as a sentence. It leaves as a brand — strategy, naming, logo, palette, type, and guidelines, generated as one cohesive system.",
};

export default function MarketingPage() {
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: fragment("marketing") }} />
      <Script src="/scripts/marketing.js" strategy="afterInteractive" />
    </>
  );
}
