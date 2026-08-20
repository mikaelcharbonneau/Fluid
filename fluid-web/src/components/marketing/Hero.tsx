"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { IdeaInput } from "./IdeaInput";

export function Hero() {
  const heroRef = useRef<HTMLElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);

  // Pointer parallax on the gradient. Deliberately not React state: this fires
  // on every mousemove, and re-rendering the hero that often would be wasteful
  // when the only thing changing is one transform.
  useEffect(() => {
    const hero = heroRef.current;
    const field = fieldRef.current;
    if (!hero || !field) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    // Fine pointers only — on touch there is no hover to track, and the
    // listener would just cost work on every tap.
    if (!window.matchMedia?.("(pointer: fine)").matches) return;

    let frame = 0;
    const onMove = (e: MouseEvent) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const r = hero.getBoundingClientRect();
        const mx = (e.clientX - r.left) / r.width - 0.5;
        const my = (e.clientY - r.top) / r.height - 0.5;
        field.style.transform = `translate3d(${(mx * -54).toFixed(1)}px, ${(my * -34).toFixed(1)}px, 0)`;
      });
    };
    hero.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      hero.removeEventListener("mousemove", onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    // data-dark drives the nav's inverted state (see useMarketingEngine).
    <header className="hero" id="top" ref={heroRef} data-dark="">
      <div className="hero-field" ref={fieldRef} aria-hidden="true">
        <i />
      </div>
      <span className="hero-scrim" aria-hidden="true" />
      <span className="hero-scrim-v" aria-hidden="true" />
      <span className="hero-grain" aria-hidden="true" />

      <div className="hero-lockup">
        <span className="hero-eyebrow" data-reveal="">
          <span className="dot" />
          <span className="wf-label">Brand systems, shaped by AI</span>
        </span>
        <h1 data-reveal="">
          From idea
          <br />
          to identity<span className="grad">.</span>
        </h1>
        <p className="hero-sub" data-reveal="">
          One sentence in. Strategy, name, logo, palette, type and guidelines out — generated as one
          system.
        </p>

        <div className="hero-cta" id="start-here" data-reveal="">
          <IdeaInput variant="hero" />
          <p className="hero-fine">
            Free to start — 20 tokens, no card. <Link href="#pricing">See pricing</Link> or{" "}
            <Link href="#transform">watch how it works</Link>.
          </p>
        </div>
      </div>

      <div className="scroll-cue" aria-hidden="true">
        <span className="bar" />
        <span className="wf-label">Scroll</span>
      </div>
    </header>
  );
}
