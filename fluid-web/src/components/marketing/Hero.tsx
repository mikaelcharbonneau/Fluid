"use client";

import { useMagnetic } from "@/components/interaction/useMagnetic";

export function Hero() {
  const ctaRef = useMagnetic<HTMLAnchorElement>(0.4);

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
            <div className="hero-cta" data-reveal="">
              <a ref={ctaRef} className="btn" href="#start">
                <span className="btn-label">Start with an idea</span>
                <span className="arr">→</span>
              </a>
            </div>
          </div>
        </div>

        <div className="scroll-cue" aria-hidden="true">
          <div className="bar" />
          <span className="wf-label">scroll to explore</span>
        </div>
      </div>
    </header>
  );
}
