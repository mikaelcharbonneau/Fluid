"use client";

import dynamic from "next/dynamic";
import { ScreenFallback } from "../_kit/screen-fallback";

const DirA_LogoBrief = dynamic(() => import("../_screens/logo-brief").then((m) => m.DirA_LogoBrief), {
  ssr: false,
  loading: () => <ScreenFallback />,
});

export default function Screen() {
  return <DirA_LogoBrief />;
}
