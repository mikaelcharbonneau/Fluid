"use client";

import dynamic from "next/dynamic";
import "../styles/prototype.css";

// The prototype writes components to `window` at module load and drives its
// own hash router, so it must render client-only (no SSR prerender).
const Prototype = dynamic(() => import("./Prototype"), { ssr: false });

export default function AppPage() {
  return <Prototype />;
}
