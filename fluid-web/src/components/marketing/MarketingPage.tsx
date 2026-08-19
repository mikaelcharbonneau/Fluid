"use client";

import { useRef } from "react";
import { CustomCursor } from "@/components/interaction/CustomCursor";
import { ScrollProgress } from "./ScrollProgress";
import { MarketingNav } from "./MarketingNav";
import { Hero } from "./Hero";
import { BrandFlow } from "./BrandFlow";
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
      <CustomCursor hideNativeCursor />
      <ScrollProgress />
      <MarketingNav />
      <Hero />
      <BrandFlow />
      <KitReveal />
      <Pricing />
      <FinalCta />
      <Footer />
    </div>
  );
}
