"use client";

import dynamic from "next/dynamic";
import { ScreenFallback } from "../_kit/screen-fallback";

const DirA_BrandsActive = dynamic(() => import("../_screens/brands-active").then((m) => m.DirA_BrandsActive), {
  ssr: false,
  loading: () => <ScreenFallback />,
});

export default function Screen() {
  return <DirA_BrandsActive />;
}
