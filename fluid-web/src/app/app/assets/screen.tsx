"use client";

import dynamic from "next/dynamic";
import { ScreenFallback } from "../_kit/screen-fallback";

const DirA_AssetsScreen = dynamic(() => import("../_screens/assets").then((m) => m.DirA_AssetsScreen), {
  ssr: false,
  loading: () => <ScreenFallback />,
});

export default function Screen() {
  return <DirA_AssetsScreen />;
}
