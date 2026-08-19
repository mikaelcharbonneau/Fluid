"use client";

import Link from "next/link";
import { IdeaInput } from "./IdeaInput";

export function Hero() {
  return (
    <header className="hero" id="top">
      <div className="hero-pin">
        <div className="hero-grid">
          <div className="hero-copy">
            <span className="hero-eyebrow" data-reveal="">
              <span className="dot" />
              <span className="wf-label">Brand systems, shaped by AI</span>
            </span>
            <h1 data-reveal="">
              From idea to brand
              <br />— <span className="grad">Instantly.</span>
            </h1>
            <p className="hero-sub" data-reveal="">
              Your idea enters as a sentence. It leaves as a brand — strategy, naming, logo, palette, type, and
              guidelines, generated as one cohesive system.
            </p>

            {/* #178: the working conversion input lives here now, in the first
                viewport. It used to sit only in the final CTA, ~18 viewports
                down, behind the scroll-jacked story section. */}
            <div className="hero-cta" id="start-here" data-reveal="">
              <IdeaInput variant="hero" />
              <p className="hero-fine">
                Free to start — 20 tokens, no card. <Link href="#pricing">See pricing</Link> or{" "}
                <Link href="#transform">watch how it works</Link>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
