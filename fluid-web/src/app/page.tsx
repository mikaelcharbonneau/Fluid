import type { Metadata } from "next";
import { fragment } from "@/lib/fragment";
import "./styles/marketing.css";

export const metadata: Metadata = {
  title: "Fluid — From idea to identity",
  description:
    "Your idea enters as a sentence. It leaves as a brand — strategy, naming, logo, palette, type, and guidelines, generated as one cohesive system.",
};

// Inline, so it runs on initial HTML load with no dependency on Next's client
// runtime. Next's afterInteractive scripts don't fire until hydration completes,
// and a single failed Next chunk (seen in Safari) stalls hydration — which left
// marketing.js unrun and every scroll-driven section blank. So we:
//   1. mark JS as available (enables the scroll-in animation states),
//   2. load marketing.js ourselves, natively, once the DOM is ready, and
//   3. fail-safe: reveal all static content after ~1.6s even if that fails.
const BOOTSTRAP = `(function(){
var d=document.documentElement;d.classList.add('js-reveal');
function load(){var s=document.createElement('script');s.src='/scripts/marketing.js';document.body.appendChild(s);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load);else load();
setTimeout(function(){var e=document.querySelectorAll('[data-reveal], .sec-head, .jstep, .board');for(var i=0;i<e.length;i++)e[i].classList.add('in');},1600);
})();`;

export default function MarketingPage() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: BOOTSTRAP }} />
      <div dangerouslySetInnerHTML={{ __html: fragment("marketing") }} />
    </>
  );
}
