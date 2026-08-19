"use client";

import dynamic from "next/dynamic";
import { ScreenFallback } from "../_kit/screen-fallback";

const DirA_Step3_Style = dynamic(() => import("../_screens/step3-style").then((m) => m.DirA_Step3_Style), {
  ssr: false,
  loading: () => <ScreenFallback />,
});

export default function Screen() {
  return <DirA_Step3_Style />;
}
