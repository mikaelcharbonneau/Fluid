"use client";

import { useEffect } from "react";
import type { RefObject } from "react";

// What is left of the scroll-driven marketing behaviour: the nav's
// stuck/on-dark state, the top progress bar, the [data-reveal] entrance
// observer and the final ribbon's draw-on. All DOM queries are scoped to
// `containerRef` rather than the original script's bare `document.*`.
//
// #178 removed the largest part of this — the six-chapter "brand-flow"
// engine that drove the 1500vh .transform-track section, roughly 360 lines
// of scroll-position maths. That story is now a plain tablist (BrandStory),
// so nothing about it depends on scroll offset any more.
//
// Never ported from the original public/scripts/marketing.js, because it was
// already dead against this page's markup: updateHero()'s .canvas/.frag
// assembly, the hero mousemove parallax, updateJourney(), and
// `body.classList.add("loaded")` (no CSS reads it). Cursor tracking and
// `[data-magnetic]` buttons live in the shared CustomCursor component and
// useMagnetic hook instead.
export function useMarketingEngine(containerRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    // marketing.css keeps [data-reveal] content visible by default and only
    // switches to the hidden-then-fade-in state once `.js-reveal` is present
    // on <html> — i.e. once this effect proves client JS actually ran. A
    // no-JS visitor (or one whose JS fails) always sees the content, per
    // that file's own comment.
    document.documentElement.classList.add("js-reveal");

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

    const q = <T extends Element = Element>(sel: string) => root.querySelector<T>(sel);
    const qa = <T extends Element = Element>(sel: string) => Array.from(root.querySelectorAll<T>(sel));

    /* -------------------------------------------------- nav + progress */
    const nav = q<HTMLElement>(".nav");
    const bar = q<HTMLElement>(".progress");
    const darkZones = qa<HTMLElement>("[data-dark]");
    function navUpdate() {
      const y = window.scrollY;
      if (nav) nav.classList.toggle("is-stuck", y > 24);
      const navMid = 32;
      let onDark = false;
      for (const zone of darkZones) {
        const r = zone.getBoundingClientRect();
        if (r.top <= navMid && r.bottom >= navMid) {
          onDark = true;
          break;
        }
      }
      if (nav) nav.classList.toggle("on-dark", onDark);
    }
    function progUpdate() {
      const h = document.documentElement;
      const max = h.scrollHeight - window.innerHeight;
      if (bar) bar.style.transform = `scaleX(${max > 0 ? clamp(window.scrollY / max, 0, 1) : 0})`;
    }

    /* -------------------------------------------------- reveal observer */
    const io = new IntersectionObserver(
      (ents) => {
        ents.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.18, rootMargin: "0px 0px -8% 0px" },
    );
    const revealTargets = qa<HTMLElement>("[data-reveal], .jstep, .board, .sec-head");
    revealTargets.forEach((el) => io.observe(el));
    const revealFailSafe = setTimeout(() => {
      qa<HTMLElement>("[data-reveal]").forEach((el) => el.classList.add("in"));
    }, 1200);

    /* -------------------------------------------------- final ribbon */
    const ribbonPath = q<SVGPathElement>(".final .ribbon-bg path");
    let ribbonObserver: IntersectionObserver | null = null;
    if (ribbonPath) {
      try {
        const len = ribbonPath.getTotalLength();
        ribbonPath.style.strokeDasharray = `${len}`;
        ribbonPath.style.strokeDashoffset = `${len}`;
        const finalSection = q<HTMLElement>(".final");
        ribbonObserver = new IntersectionObserver(
          (entries) => {
            if (entries[0].isIntersecting && !reduce) {
              ribbonPath.style.transition = "stroke-dashoffset 2.4s cubic-bezier(0.22,0.61,0.36,1)";
              ribbonPath.style.strokeDashoffset = "0";
              ribbonObserver?.disconnect();
            } else if (entries[0].isIntersecting) {
              ribbonPath.style.strokeDashoffset = "0";
              ribbonObserver?.disconnect();
            }
          },
          { threshold: 0.3 },
        );
        if (finalSection) ribbonObserver.observe(finalSection);
      } catch {
        // Safari can throw on getTotalLength() for a not-yet-rendered path.
        // The ribbon just won't draw-on; everything else keeps working.
      }
    }

    /* -------------------------------------------------- main rAF loop */
    let ticking = false;
    let frameHandle = 0;
    function frame() {
      navUpdate();
      progUpdate();
      ticking = false;
    }
    function onScroll() {
      if (!ticking) {
        ticking = true;
        frameHandle = requestAnimationFrame(frame);
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    frame();
    qa<HTMLElement>(".hero [data-reveal]").forEach((el, i) => {
      el.style.setProperty("--d", `${i * 90}ms`);
      el.classList.add("in");
    });
    const settleTimer = setTimeout(frame, 400);

    return () => {
      document.documentElement.classList.remove("js-reveal");
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frameHandle);
      clearTimeout(revealFailSafe);
      clearTimeout(settleTimer);
      io.disconnect();
      ribbonObserver?.disconnect();
    };
  }, [containerRef]);
}
