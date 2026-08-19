"use client";

import dynamic from "next/dynamic";
import { ScreenFallback } from "../_kit/screen-fallback";

const DirA_KitSummary = dynamic(() => import("../_screens/step5-kit").then((m) => m.DirA_KitSummary), {
  ssr: false,
  loading: () => <ScreenFallback />,
});

export default function Screen() {
  return <DirA_KitSummary />;
}
