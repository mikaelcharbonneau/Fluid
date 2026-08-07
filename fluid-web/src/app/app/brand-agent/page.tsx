"use client";

import dynamic from "next/dynamic";

// Same shell pattern as src/app/app/chat/page.tsx: this owns its own header/
// thread outside the prototype, and reads window.location on mount to
// resume a thread, so there's nothing useful to prerender.
const BrandAgentChat = dynamic(() => import("./BrandAgentChat").then((m) => m.BrandAgentChat), {
  ssr: false,
});

export default function BrandAgentPage() {
  return <BrandAgentChat />;
}
