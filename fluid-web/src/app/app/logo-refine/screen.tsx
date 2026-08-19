"use client";

import dynamic from "next/dynamic";
import { ScreenFallback } from "../_kit/screen-fallback";

const DirA_LogoRefine = dynamic(() => import("../_screens/logo-refine").then((m) => m.DirA_LogoRefine), {
  ssr: false,
  loading: () => <ScreenFallback />,
});

export default function Screen() {
  return <DirA_LogoRefine />;
}
