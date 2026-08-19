"use client";

import dynamic from "next/dynamic";
import { ScreenFallback } from "../_kit/screen-fallback";

const DirA_LogoReferences = dynamic(() => import("../_screens/logo-references").then((m) => m.DirA_LogoReferences), {
  ssr: false,
  loading: () => <ScreenFallback />,
});

export default function Screen() {
  return <DirA_LogoReferences />;
}
