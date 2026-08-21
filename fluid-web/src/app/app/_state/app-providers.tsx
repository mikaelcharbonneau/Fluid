"use client";

import React from "react";
import dynamic from "next/dynamic";
import { RouterProvider } from "./router-provider";
import { BrandDraftProvider } from "./brand-draft-provider";
import { useTweaks } from "../_kit/use-tweaks";
import { PROTO_DEFAULTS, BRAND_TO_ATTR } from "./tweak-defaults";

// The tweaks panel and the quick-jump pill are prototype review tools, not
// product surface. Loading them lazily keeps ~500 lines of control chrome out
// of every route's initial chunk.
const DevTools = dynamic(() => import("./dev-tools").then((m) => m.DevTools), { ssr: false });

// Everything the 18 screens need in context, in the order the original
// single-file App mounted it: router first (BrandDraftProvider reads the
// current route), then brand state.
export function AppProviders({ children }: { children: React.ReactNode }) {
  const [t, setTweak] = useTweaks(PROTO_DEFAULTS);

  React.useEffect(() => {
    document.body.dataset.brand = (BRAND_TO_ATTR as Record<string, string>)[t.brand] || "";
  }, [t.brand]);

  const updateTweak = (key: string, value: unknown) => {
    if (key === "brand" && typeof value === "string") setTweak("brand", value);
    if (key === "showQuickJump" && typeof value === "boolean") setTweak("showQuickJump", value);
  };

  return (
    <RouterProvider>
      <BrandDraftProvider>
        {children}
        <DevTools tweaks={t} setTweak={updateTweak} />
      </BrandDraftProvider>
    </RouterProvider>
  );
}
