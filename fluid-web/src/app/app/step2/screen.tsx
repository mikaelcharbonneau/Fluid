"use client";

import dynamic from "next/dynamic";
import { ScreenFallback } from "../_kit/screen-fallback";

const DirA_Step2_Name = dynamic(() => import("../_screens/step2-name").then((m) => m.DirA_Step2_Name), {
  ssr: false,
  loading: () => <ScreenFallback />,
});

export default function Screen() {
  return <DirA_Step2_Name />;
}
