"use client";

import { useRef } from "react";
import { CustomCursor } from "@/components/interaction/CustomCursor";
import { ScrollProgress } from "./ScrollProgress";
import { MarketingNav } from "./MarketingNav";
import { Hero } from "./Hero";
import { BrandStory } from "./BrandStory";
import { KitReveal } from "./KitReveal";
import { Pricing } from "./Pricing";
import { FinalCta } from "./FinalCta";
import { Footer } from "./Footer";
import { useMarketingEngine } from "./useMarketingEngine";

export function MarketingPage() {
  const rootRef = useRef<HTMLDivElement>(null);
  useMarketingEngine(rootRef);

  return (
    <div ref={rootRef}>
      {/* #178: first in the tab order, so a keyboard visitor reaches the
          input the page exists for without tabbing the whole nav. */}
      <a className="skip-link" href="#start-here">Skip to the idea input</a>
      <CustomCursor hideNativeCursor />
      <ScrollProgress />
      <MarketingNav />
      <Hero />
      <BrandStory />
      <KitReveal />
      <Pricing />
      <FinalCta />
      <Footer />
    </div>
  );
}
