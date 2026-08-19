"use client";

import dynamic from "next/dynamic";
import { ScreenFallback } from "../_kit/screen-fallback";

const DirA_LogoDirection = dynamic(() => import("../_screens/logo-direction").then((m) => m.DirA_LogoDirection), {
  ssr: false,
  loading: () => <ScreenFallback />,
});

export default function Screen() {
  return <DirA_LogoDirection />;
}
