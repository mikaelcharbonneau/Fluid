"use client";

import dynamic from "next/dynamic";

// The chat owns its own shell — header, sidebar, thread — so it renders
// outside the prototype entirely. It reads window.location on mount to resume
// a thread, so there is nothing useful to prerender.
const BrandChat = dynamic(() => import("./BrandChat").then((m) => m.BrandChat), {
  ssr: false,
});

export default function BrandChatPage() {
  return <BrandChat />;
}
