"use client";

import { useEffect } from "react";
import type { RefObject } from "react";

// Faithful port of the scroll-driven parts of public/scripts/marketing.js:
// nav stuck/on-dark state, the top progress bar, the [data-reveal] entrance
// observer, the ribbon draw-on, and the "brand-flow" 6-chapter scrollytelling
// engine that drives the 1500vh .transform-track section. All DOM queries are
// scoped to `containerRef` instead of the original's bare `document.*`.
//
// Deliberately NOT ported (present in marketing.js but dead against the
// actual markup rendered by this page — there is no `.canvas`/`.frag` hero
// assembly, no `.journey-steps` section, and no CSS reads `body.loaded`):
// updateHero()'s canvas/frag logic, the hero mousemove parallax listener,
// updateJourney(), and the `body.classList.add("loaded")` call. Cursor
// tracking and `[data-magnetic]` buttons are handled by the shared
// CustomCursor component and useMagnetic hook instead of this engine.
//
// The .transform-track / brand-flow section this engine drives is exactly
// what #178 replaces with a redesigned, non-scroll-jacking implementation —
// this port keeps it working as-is in the meantime rather than reworking it.
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
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const smooth = (t: number) => {
      t = clamp(t, 0, 1);
      return t * t * (3 - 2 * t);
    };
    const winOpacity = (p: number, a: number, b: number, f: number) => {
      const i = clamp((p - a) / f, 0, 1);
      const o = clamp((b - p) / f, 0, 1);
      return Math.min(i, o);
    };
    const easeOutBack = (t: number) => {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    };
    const L = (p: number, a: number, b: number) => clamp((p - a) / (b - a), 0, 1);
    const setOp = (el: HTMLElement | null, o: number) => {
      if (el) el.style.opacity = clamp(o, 0, 1).toFixed(3);
    };
    const capLine = (el: HTMLElement | null, lp: number, d: number) => {
      if (!el) return;
      const inT = smooth(clamp((lp - d) / 0.2, 0, 1));
      const outT = smooth(clamp((lp - 0.9) / 0.1, 0, 1));
      el.style.opacity = (inT * (1 - outT)).toFixed(3);
      el.style.transform = `translateY(${((1 - inT) * 18 - outT * 10).toFixed(1)}px)`;
    };
    type Point = { x: number; y: number };
    const poly = (t: number, pts: Point[]): Point => {
      if (!pts.length) return { x: 0, y: 0 };
      if (pts.length < 2) return pts[0];
      const seg = 1 / (pts.length - 1);
      const i = clamp(Math.floor(t / seg), 0, pts.length - 2);
      const lt = (t - i * seg) / seg;
      return { x: lerp(pts[i].x, pts[i + 1].x, lt), y: lerp(pts[i].y, pts[i + 1].y, lt) };
    };

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

    /* -------------------------------------------------- BRAND-FLOW engine */
    const bfTrack = q<HTMLElement>(".transform-track");
    const bfPin = q<HTMLElement>(".transform .pin");
    const bfCanvas = q<HTMLElement>(".transform .tf-canvas");
    const bfStep = {
      select: q<HTMLElement>('.bf-step[data-step="select"]'),
      input: q<HTMLElement>('.bf-step[data-step="input"]'),
      direction: q<HTMLElement>('.bf-step[data-step="direction"]'),
      name: q<HTMLElement>('.bf-step[data-step="name"]'),
      logo: q<HTMLElement>('.bf-step[data-step="logo"]'),
      delivery: q<HTMLElement>('.bf-step[data-step="delivery"]'),
      hero: q<HTMLElement>('.bf-step[data-step="hero"]'),
    };
    const bfCards = qa<HTMLElement>(".bf-services .svc");
    const bfMain = q<HTMLElement>(".svc-main");
    const bfOrb = q<HTMLElement>(".bf-orb");
    const bfField = q<HTMLElement>(".bf-field");
    const bfTyped = q<HTMLElement>(".bf-typed");
    const bfNext = q<HTMLElement>(".bf-next");
    const bfMoods = qa<HTMLElement>(".bf-moods .mood");
    const bfMoodsTrack = q<HTMLElement>(".bf-moods");
    const bfDir = q<HTMLElement>(".bf-dir");
    const bfDirArrow = q<HTMLButtonElement>(".bf-dir-arrow");
    const bfDirLabel = q<HTMLElement>(".bf-dir-label");
    const DIR_NAMES = ["Minimal", "Futuristic", "Playful", "Luxury", "Organic"];
    const bfNamesEl = q<HTMLElement>(".bf-names");
    const bfNameTitle = q<HTMLElement>('.bf-step[data-step="name"] .bf-steptitle');
    const bfLogoTitle = q<HTMLElement>('.bf-step[data-step="logo"] .bf-steptitle');
    const bfNames = qa<HTMLElement>(".bf-names .bf-name");
    const bfNameFinal = q<HTMLElement>(".bf-name-final");
    const bfExploreEl = q<HTMLElement>(".bf-logo-explore");
    const bfLx = qa<HTMLElement>(".bf-logo-explore .lx");
    const bfLogoFinal = q<HTMLElement>(".bf-logo-final");
    const bfKit = qa<HTMLElement>(".bf-kit .kc");
    const bfHeroEls = qa<HTMLElement>(".bf-hero [data-h]");
    const bfSegs = qa<HTMLElement>(".tf-progress .seg i");
    const bfCaption = q<HTMLElement>(".tf-caption");
    const bfCapEyebrow = q<HTMLElement>(".tf-eyebrow");
    const bfCapTitle = q<HTMLElement>(".tf-title");
    const bfCapDesc = q<HTMLElement>(".tf-desc");
    const BF_CAPS: [string, string, string][] = [
      [
        "01 · Choose a service",
        "Pick your scope.",
        "Start with complete branding, or just the piece you need — name, logo, graphics or guidelines.",
      ],
      [
        "02 · Your idea",
        "Describe the thing.",
        "One sentence about what you're building and who it's for. That's the whole brief — Fluid does the rest.",
      ],
      [
        "03 · Visual direction",
        "Set the mood.",
        "Pick a direction — minimal, futuristic, playful, luxury or organic. It steers every asset downstream.",
      ],
      [
        "04 · Name",
        "Name it.",
        "Generated name candidates, scored and rendered as wordmarks. The strongest one rises to the top.",
      ],
      [
        "05 · Logo",
        "Draw the mark.",
        "The chosen name becomes a logo mark with construction grid, clear-space and lockups.",
      ],
      [
        "06 · Brand system",
        "Lock the system.",
        "Logo, palette, type, app icon, wordmark and guidelines assemble into one exportable brand kit.",
      ],
    ];
    let bfCapCI = -1;
    const BF_TEXT = "A branding agency powered by AI agents";
    const CHOSEN_DIR = 4;
    const CHOSEN_NAME = 5;
    const DISMISS_NAME = [0, 2, 3];

    const DIR_VISIBLE = 4;
    const dirMaxStep = Math.max(0, bfMoods.length - DIR_VISIBLE);
    function dirStepPx() {
      if (!bfDir) return 196 + 16;
      const cs = getComputedStyle(bfDir);
      const cw = parseFloat(cs.getPropertyValue("--cw")) || 196;
      const cg = parseFloat(cs.getPropertyValue("--cg")) || 16;
      return cw + cg;
    }
    let dirCurOffset = 0;
    function applyDir(offset: number) {
      if (!bfMoodsTrack || !bfDir) return;
      offset = clamp(offset, 0, dirMaxStep);
      dirCurOffset = offset;
      bfMoodsTrack.style.setProperty("--dir-x", `${(-offset * dirStepPx()).toFixed(1)}px`);
      bfDir.classList.toggle("is-scrolled", offset > 0);
      bfDir.classList.toggle("at-end", offset >= dirMaxStep && dirMaxStep > 0);
      if (bfDirArrow) bfDirArrow.disabled = offset >= dirMaxStep;
    }
    const onDirArrowClick = () => applyDir(dirCurOffset + 1);
    bfDirArrow?.addEventListener("click", onDirArrowClick);

    const CR = {
      select: [0.0, 0.115],
      input: [0.115, 0.235],
      direction: [0.235, 0.42],
      name: [0.42, 0.575],
      logo: [0.575, 0.76],
      delivery: [0.71, 0.905],
      hero: [0.905, 1.0],
    };

    function bfCenter(el: HTMLElement, base: DOMRect): Point {
      const r = el.getBoundingClientRect();
      return { x: r.left - base.left + r.width / 2, y: r.top - base.top + r.height / 2 };
    }

    function updateTransform() {
      if (!bfTrack || !bfPin || !bfCanvas) return;
      const rect = bfTrack.getBoundingClientRect();
      const total = bfTrack.offsetHeight - window.innerHeight;
      const p = clamp(-rect.top / (total || 1), 0, 1);
      const base = bfCanvas.getBoundingClientRect();
      const f = 0.016;

      const vSel = winOpacity(p, -0.02, 0.115, f);
      const vIn = winOpacity(p, 0.115, 0.235, f);
      const vDir = winOpacity(p, 0.235, 0.42, f);
      const vName = winOpacity(p, 0.42, 0.575, f);
      const vLogo = winOpacity(p, 0.575, 0.76, f);
      const vDel = winOpacity(p, 0.71, 0.9, f);
      const vHero = smooth(L(p, 0.9, 0.932));
      setOp(bfStep.select, vSel);
      setOp(bfStep.input, vIn);
      setOp(bfStep.direction, vDir);
      setOp(bfStep.name, vName);
      setOp(bfStep.logo, vLogo);
      setOp(bfStep.delivery, vDel);
      setOp(bfStep.hero, vHero);

      if (vSel > 0.001) {
        const ls = L(p, CR.select[0], CR.select[1]);
        const focusMain = smooth(L(ls, 0.55, 0.8));
        bfCards.forEach((c, k) => {
          const t = clamp((ls - k * 0.1) / 0.3, 0, 1);
          const e = easeOutBack(t);
          let o = clamp(t * 1.6, 0, 1);
          if (k > 0) o *= 1 - focusMain * 0.62;
          c.style.opacity = o.toFixed(3);
          c.style.setProperty("--rise", `${((1 - e) * 26).toFixed(1)}px`);
          c.style.setProperty("--cs", lerp(0.95, 1, clamp(e, 0, 1)).toFixed(3));
        });
        if (bfMain) {
          bfMain.style.setProperty("--hot", smooth(L(ls, 0.5, 0.8)).toFixed(3));
          bfMain.classList.toggle("is-selected", ls > 0.8);
        }
      }

      if (vIn > 0.001) {
        const li = L(p, CR.input[0], CR.input[1]);
        const typeP = clamp(L(li, 0.15, 0.62), 0, 1);
        if (bfTyped) bfTyped.textContent = BF_TEXT.slice(0, Math.round(typeP * BF_TEXT.length));
        if (bfField) {
          bfField.classList.toggle("is-focus", li > 0.05 && li < 0.97);
          bfField.classList.toggle("is-typing", li > 0.08 && typeP < 1);
        }
        if (bfNext) {
          bfNext.style.setProperty("--hot", smooth(L(li, 0.72, 0.9)).toFixed(3));
          bfNext.classList.toggle("is-active", L(li, 0.9, 1.0) > 0.5);
        }
      }

      if (vDir > 0.001) {
        const ld = L(p, CR.direction[0], CR.direction[1]);
        const reviewIdx = clamp(Math.floor(L(ld, 0.32, 0.6) * bfMoods.length), 0, bfMoods.length - 1);
        const settleD = smooth(L(ld, 0.6, 0.78));
        const expandD = smooth(L(ld, 0.78, 1.0));
        bfMoods.forEach((m, k) => {
          const t = clamp((ld - k * 0.06) / 0.26, 0, 1);
          const e = easeOutBack(t);
          m.style.opacity = clamp(t * 1.6, 0, 1).toFixed(3);
          m.style.setProperty("--rise", `${((1 - e) * 30).toFixed(1)}px`);
          const hot = settleD < 0.5 ? k === reviewIdx : k === CHOSEN_DIR;
          m.classList.toggle("is-hot", hot && expandD < 0.4);
          if (expandD > 0.05) {
            m.classList.toggle("is-chosen", k === CHOSEN_DIR);
            m.classList.toggle("is-faded", k !== CHOSEN_DIR);
          } else {
            m.classList.remove("is-chosen");
            m.classList.remove("is-faded");
          }
        });
        const dirTarget =
          settleD < 0.5
            ? clamp(reviewIdx - (DIR_VISIBLE - 1), 0, dirMaxStep)
            : clamp(CHOSEN_DIR - (DIR_VISIBLE - 1), 0, dirMaxStep);
        if (dirTarget !== dirCurOffset) applyDir(dirTarget);
        if (bfDirLabel) {
          const labelIdx = settleD < 0.5 ? reviewIdx : CHOSEN_DIR;
          const valEl = bfDirLabel.querySelector<HTMLElement>(".val");
          if (valEl && valEl.textContent !== DIR_NAMES[labelIdx]) valEl.textContent = DIR_NAMES[labelIdx];
          bfDirLabel.classList.toggle("is-locked", settleD >= 0.5);
        }
      }

      if (vName > 0.001) {
        const ln = L(p, CR.name[0], CR.name[1]);
        const reviewN = clamp(Math.floor(L(ln, 0.4, 0.62) * bfNames.length), 0, bfNames.length - 1);
        const decideN = smooth(L(ln, 0.62, 0.8));
        const crownN = smooth(L(ln, 0.8, 1.0));
        bfNames.forEach((nm, k) => {
          const t = clamp((ln - k * 0.06) / 0.22, 0, 1);
          nm.style.opacity = clamp(t * 1.6, 0, 1).toFixed(3);
          nm.style.setProperty("--rise", `${((1 - easeOutBack(t)) * 18).toFixed(1)}px`);
          nm.classList.toggle("is-dismissed", DISMISS_NAME.indexOf(k) >= 0 && ln > 0.46 + k * 0.012);
          nm.classList.toggle("is-review", decideN < 0.35 && k === reviewN && DISMISS_NAME.indexOf(k) < 0);
          nm.classList.toggle("is-win", k === CHOSEN_NAME && decideN > 0.4);
        });
        if (bfNamesEl) bfNamesEl.style.opacity = (1 - crownN).toFixed(3);
        if (bfNameTitle) bfNameTitle.style.opacity = (1 - crownN).toFixed(3);
        if (bfNameFinal) {
          bfNameFinal.style.opacity = crownN.toFixed(3);
          bfNameFinal.style.transform = `scale(${lerp(0.92, 1, crownN).toFixed(3)})`;
        }
      }

      if (vLogo > 0.001) {
        const lg = L(p, CR.logo[0], CR.logo[1]);
        const testIdx = clamp(Math.floor(L(lg, 0.32, 0.55) * bfLx.length), 0, bfLx.length - 1);
        const convergeG = smooth(L(lg, 0.52, 0.72));
        const revealG = 0;
        bfLx.forEach((tile, k) => {
          const t = clamp((lg - k * 0.06) / 0.24, 0, 1);
          tile.style.opacity = (clamp(t * 1.6, 0, 1) * (1 - convergeG)).toFixed(3);
          tile.style.setProperty("--rise", `${((1 - easeOutBack(t)) * 26).toFixed(1)}px`);
          tile.classList.toggle("is-test", convergeG < 0.3 && k === testIdx);
        });
        if (bfExploreEl) bfExploreEl.style.opacity = (1 - revealG).toFixed(3);
        if (bfLogoTitle) bfLogoTitle.style.opacity = (1 - revealG).toFixed(3);
        if (bfLogoFinal) {
          bfLogoFinal.style.opacity = revealG.toFixed(3);
          bfLogoFinal.classList.toggle("show", revealG > 0.05);
        }
      }

      if (vDel > 0.001) {
        const ldv = L(p, CR.delivery[0], CR.delivery[1]);
        bfKit.forEach((kc, k) => {
          const t = clamp((ldv - k * 0.085) / 0.34, 0, 1);
          const e = smooth(t);
          kc.style.opacity = e.toFixed(3);
          kc.style.transform = `translateY(${((1 - e) * 34).toFixed(1)}px) scale(${lerp(0.92, 1, e).toFixed(3)})`;
        });
      }

      if (vHero > 0.001) {
        const lh = L(p, CR.hero[0], CR.hero[1]);
        bfHeroEls.forEach((h, k) => {
          const t = clamp((lh - k * 0.1) / 0.4, 0, 1);
          const e = smooth(t);
          h.style.opacity = e.toFixed(3);
          h.style.transform = `translateY(${((1 - e) * 28).toFixed(1)}px)`;
        });
      }

      const orb = { x: base.width * 0.5, y: base.height * 0.5, s: 1, o: 0, pulse: 0 };
      if (p < CR.select[1]) {
        const s1 = L(p, CR.select[0], CR.select[1]);
        const travel1 = smooth(L(s1, 0.5, 0.8));
        const selPulse = smooth(L(s1, 0.8, 0.95));
        const mainC = bfMain ? bfCenter(bfMain, base) : { x: base.width * 0.34, y: base.height * 0.5 };
        orb.x = lerp(base.width * 0.86, mainC.x, travel1);
        orb.y = lerp(base.height * 1.04, mainC.y, travel1);
        orb.o = smooth(L(s1, 0.42, 0.5)) * (1 - smooth(L(s1, 0.93, 1)));
        orb.s = 1 - Math.sin(selPulse * Math.PI) * 0.22;
        orb.pulse = selPulse;
      } else if (p < CR.input[1]) {
        const s2 = L(p, CR.input[0], CR.input[1]);
        if (s2 > 0.64) {
          const travel2 = smooth(L(s2, 0.72, 0.9));
          const clickPulse = smooth(L(s2, 0.9, 1.0));
          const fieldC = bfField ? bfCenter(bfField, base) : { x: base.width * 0.5, y: base.height * 0.42 };
          const nextC = bfNext ? bfCenter(bfNext, base) : { x: base.width * 0.7, y: base.height * 0.66 };
          orb.x = lerp(fieldC.x, nextC.x, travel2);
          orb.y = lerp(fieldC.y, nextC.y, travel2);
          orb.o = smooth(L(s2, 0.64, 0.72));
          orb.s = 1 - Math.sin(clickPulse * Math.PI) * 0.22;
          orb.pulse = clickPulse;
        }
      } else if (p < CR.direction[1] && bfMoods.length) {
        const d = L(p, CR.direction[0], CR.direction[1]);
        const ptsD = bfMoods.map((m) => bfCenter(m, base));
        const settleD2 = smooth(L(d, 0.6, 0.74));
        const pos =
          settleD2 <= 0
            ? poly(L(d, 0.3, 0.62), ptsD)
            : (() => {
                const cc = bfCenter(bfMoods[CHOSEN_DIR], base);
                const rp = poly(1, ptsD);
                return { x: lerp(rp.x, cc.x, settleD2), y: lerp(rp.y, cc.y, settleD2) };
              })();
        orb.x = pos.x;
        orb.y = pos.y;
        orb.o = smooth(L(d, 0.2, 0.3)) * (1 - smooth(L(d, 0.8, 0.9)));
        const clkD = smooth(L(d, 0.66, 0.78));
        orb.s = 1 - Math.sin(clkD * Math.PI) * 0.2;
        orb.pulse = clkD;
      } else if (p < CR.name[1] && bfNames.length) {
        const n = L(p, CR.name[0], CR.name[1]);
        const ptsN = bfNames.map((nm) => bfCenter(nm, base));
        const settleN = smooth(L(n, 0.6, 0.74));
        const posN =
          settleN <= 0
            ? poly(L(n, 0.38, 0.62), ptsN)
            : (() => {
                const cc = bfCenter(bfNames[CHOSEN_NAME], base);
                const rp = poly(1, ptsN);
                return { x: lerp(rp.x, cc.x, settleN), y: lerp(rp.y, cc.y, settleN) };
              })();
        orb.x = posN.x;
        orb.y = posN.y;
        orb.o = smooth(L(n, 0.3, 0.4)) * (1 - smooth(L(n, 0.76, 0.85)));
        const clkN = smooth(L(n, 0.64, 0.78));
        orb.s = 1 - Math.sin(clkN * Math.PI) * 0.2;
        orb.pulse = clkN;
      } else if (p < CR.logo[1] && bfLx.length) {
        const g = L(p, CR.logo[0], CR.logo[1]);
        const ptsG = bfLx.map((t) => bfCenter(t, base));
        const posG = poly(L(g, 0.3, 0.55), ptsG);
        orb.x = posG.x;
        orb.y = posG.y;
        orb.o = smooth(L(g, 0.2, 0.3)) * (1 - smooth(L(g, 0.55, 0.64)));
        orb.pulse = 0;
      }
      if (bfOrb) {
        bfOrb.style.opacity = Math.sin(clamp(orb.pulse, 0, 1) * Math.PI).toFixed(3);
        bfOrb.style.transform = `translate(${orb.x.toFixed(1)}px,${orb.y.toFixed(1)}px) translate(-50%,-50%) scale(${orb.s.toFixed(3)})`;
        bfOrb.classList.toggle("is-armed", orb.pulse > 0.02);
        bfOrb.style.setProperty("--pscale", lerp(0.55, 2.5, orb.pulse).toFixed(3));
        bfOrb.style.setProperty("--po", Math.sin(clamp(orb.pulse, 0, 1) * Math.PI).toFixed(3));
      }

      const bounds = [0, 0.115, 0.235, 0.42, 0.575, 0.71, 1.001];
      for (let i = 0; i < 6; i++) {
        if (bfSegs[i]) bfSegs[i].style.transform = `scaleX(${L(p, bounds[i], bounds[i + 1]).toFixed(3)})`;
      }
      let ci = 0;
      for (let i = 0; i < 6; i++) {
        if (p >= bounds[i]) ci = i;
      }
      if (bfCaption) {
        if (ci !== bfCapCI) {
          bfCapCI = ci;
          const cap = BF_CAPS[ci];
          if (bfCapEyebrow) bfCapEyebrow.textContent = cap[0];
          if (bfCapTitle) bfCapTitle.textContent = cap[1];
          if (bfCapDesc) bfCapDesc.textContent = cap[2];
        }
        const lp = L(p, bounds[ci], bounds[ci + 1]);
        capLine(bfCapEyebrow, lp, 0.0);
        capLine(bfCapTitle, lp, 0.05);
        capLine(bfCapDesc, lp, 0.1);
      }
    }

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
      updateTransform();
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
      bfDirArrow?.removeEventListener("click", onDirArrowClick);
    };
  }, [containerRef]);
}
