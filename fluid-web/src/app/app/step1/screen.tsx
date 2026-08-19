"use client";

import dynamic from "next/dynamic";
import { ScreenFallback } from "../_kit/screen-fallback";

const DirA_Step1_Brief = dynamic(() => import("../_screens/step1-brief").then((m) => m.DirA_Step1_Brief), {
  ssr: false,
  loading: () => <ScreenFallback />,
});

export default function Screen() {
  return <DirA_Step1_Brief />;
}
