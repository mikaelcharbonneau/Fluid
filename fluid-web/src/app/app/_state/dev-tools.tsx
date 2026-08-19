"use client";

import { QuickJump } from "./quick-jump";
import { TweaksPanel, TweakSection, TweakRadio, TweakToggle } from "../_kit/tweaks";
import { BRAND_NOTE } from "./tweak-defaults";

// The prototype's two review affordances, lifted verbatim out of the original
// single-file App: the brand-accent tweaks panel and the quick-jump route
// pill. Split into their own lazily-loaded module by #175 so ~500 lines of
// review chrome stay out of every route's initial chunk.
export function DevTools({
  tweaks,
  setTweak,
}: {
  tweaks: Record<string, string | boolean>;
  setTweak: (key: string, value: unknown) => void;
}) {
  return (
    <>
      {tweaks.showQuickJump && <QuickJump />}

      <TweaksPanel>
        <TweakSection label="Brand accent" />
        <TweakRadio
          label="Gradient use"
          value={tweaks.brand}
          options={["Signature", "Rare", "Solid"]}
          onChange={(v: string) => setTweak("brand", v)}
        />
        <div style={{ fontSize: 11.5, lineHeight: 1.5, color: "#8A8A90", padding: "2px 2px 6px" }}>
          {(BRAND_NOTE as Record<string, string>)[tweaks.brand as string]}
        </div>

        <TweakSection label="Prototype" />
        <TweakToggle
          label="Quick-jump pill"
          value={tweaks.showQuickJump}
          onChange={(v: boolean) => setTweak("showQuickJump", v)}
        />
        <div style={{ fontSize: 11.5, lineHeight: 1.5, color: "#8A8A90", padding: "2px 2px 6px" }}>
          Always-visible route switcher in the bottom-right. Off → navigate purely through the in-product CTAs and the left rail.
        </div>
      </TweaksPanel>
    </>
  );
}
