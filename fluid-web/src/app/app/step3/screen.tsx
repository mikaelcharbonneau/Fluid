"use client";

import dynamic from "next/dynamic";
import { ScreenFallback } from "../_kit/screen-fallback";

const DirA_Step4_Logo = dynamic(() => import("../_screens/step4-logo").then((m) => m.DirA_Step4_Logo), {
  ssr: false,
  loading: () => <ScreenFallback />,
});

export default function Screen() {
  return <DirA_Step4_Logo />;
}
