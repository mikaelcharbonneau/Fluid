"use client";

import dynamic from "next/dynamic";
import { ScreenFallback } from "../_kit/screen-fallback";

const DirA_LogoSketches = dynamic(() => import("../_screens/logo-sketches").then((m) => m.DirA_LogoSketches), {
  ssr: false,
  loading: () => <ScreenFallback />,
});

export default function Screen() {
  return <DirA_LogoSketches />;
}
