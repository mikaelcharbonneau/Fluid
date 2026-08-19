"use client";

import dynamic from "next/dynamic";
import { ScreenFallback } from "../_kit/screen-fallback";

const DirA_Settings = dynamic(() => import("../_screens/settings").then((m) => m.DirA_Settings), {
  ssr: false,
  loading: () => <ScreenFallback />,
});

export default function Screen() {
  return <DirA_Settings />;
}
