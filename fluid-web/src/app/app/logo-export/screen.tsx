"use client";

import dynamic from "next/dynamic";
import { ScreenFallback } from "../_kit/screen-fallback";

const DirA_LogoExport = dynamic(() => import("../_screens/logo-export").then((m) => m.DirA_LogoExport), {
  ssr: false,
  loading: () => <ScreenFallback />,
});

export default function Screen() {
  return <DirA_LogoExport />;
}
