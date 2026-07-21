import Script from "next/script";
import type { Metadata } from "next";
import { fragment } from "@/lib/fragment";
import "./styles/marketing.css";

export const metadata: Metadata = {
  title: "Fluid — From idea to identity",
  description:
    "Your idea enters as a sentence. It leaves as a brand — strategy, naming, logo, palette, type, and guidelines, generated as one cohesive system.",
};

// Inline, so it runs on initial HTML load without depending on any Next.js
// client chunk: mark JS as available (enables the scroll-in animations) and
// guarantee every reveal element becomes visible even if marketing.js / a Next
// chunk fails to load (which was blanking the hero in Safari).
const REVEAL_FAILSAFE = `(function(){var d=document.documentElement;d.classList.add('js-reveal');setTimeout(function(){var e=document.querySelectorAll('[data-reveal], .sec-head, .jstep, .board');for(var i=0;i<e.length;i++)e[i].classList.add('in');},1600);})();`;

export default function MarketingPage() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: REVEAL_FAILSAFE }} />
      <div dangerouslySetInnerHTML={{ __html: fragment("marketing") }} />
      <Script src="/scripts/marketing.js" strategy="afterInteractive" />
    </>
  );
}
