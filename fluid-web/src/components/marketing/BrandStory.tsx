"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

// The six chapters of the brand story, driven by scroll position.
//
// History: this was originally a `height:1500vh` track wrapping a sticky pin —
// fifteen screens of hijacked scrolling before anyone reached pricing (#178).
// That was replaced by an auto-advancing tablist, which read as a slideshow.
//
// This is the middle path. Scroll still drives the chapters and the section
// still pins, so it *demonstrates* rather than lists — but the track is
// TRACK_VH tall instead of 1500vh, the tabs remain a full, always-visible
// control that jumps straight to any chapter, and under prefers-reduced-motion
// the track collapses to normal flow (see marketing.css) so nothing depends on
// scrolling at all. The conversion input stays in the hero either way.

const SERVICE_MOSAIC = [
  [
    "/assets/uuid/de41faa1-d8a8-4614-be87-fe2631f8cd57.jpg",
    "/assets/uuid/0fbbf969-da88-4af8-a6f5-ab46453c25e8.jpg",
    "/assets/uuid/b9f88c5a-1d0e-4b32-9641-b701bd163c6a.jpg",
  ],
  [
    "/assets/uuid/3cdcedb3-90ab-45f4-abb4-d7db48e05495.jpg",
    "/assets/uuid/448302bd-aab5-4064-9e9b-97df99c425cc.jpg",
    "/assets/uuid/4b838918-49da-4be4-8f74-7f99706ea2a8.jpg",
  ],
  [
    "/assets/uuid/20336473-0d9c-4edd-a918-eb56cae4b66c.jpg",
    "/assets/uuid/68a0e21c-787a-48ba-b002-28d2e666067d.jpg",
    "/assets/uuid/000d1af3-15d2-4f38-8fa8-890852c082e6.jpg",
  ],
];

const SIDE_SERVICES = [
  { title: "Name", desc: "Generated names with reasoning and domain status.", preview: "/assets/uuid/016471e6-dfca-411f-a978-17c49f028a3e.jpg" },
  { title: "Logo", desc: "Marks, lockups & construction in seconds.", preview: "/assets/uuid/fd3dd2dc-8a9e-464a-a26d-6d53f83380b0.jpg" },
  { title: "Graphics", desc: "Patterns, icons & social-ready visuals.", preview: "/assets/uuid/3cdcedb3-90ab-45f4-abb4-d7db48e05495.jpg" },
  { title: "Guidelines", desc: "Already have a logo? We'll write the rules.", preview: "/assets/uuid/2b237735-7a60-426c-a3eb-b5a18cd21d09.jpg" },
];

const MOODS = [
  { name: "Minimal", img: "/assets/uuid/de5eccff-fb6a-44cc-8098-f86da74c1546.jpg" },
  { name: "Futuristic", img: "/assets/uuid/ec4af0ed-074e-49e9-895e-b1ca3fbb4354.jpg" },
  { name: "Playful", img: "/assets/uuid/4607f3ad-b492-4e6e-ac1f-2bc5380ffe0b.jpg" },
  { name: "Luxury", img: "/assets/uuid/37409f65-16ae-4427-9995-1740ed736aaa.jpg" },
  { name: "Organic", img: "/assets/uuid/a230b6ed-aebf-4b2f-958e-f808034f8504.jpg" },
];

const NAMES = ["Nomos", "Lumen", "Aria", "Halo", "Forge", "Fluid"];

const LOGO_SKETCHES = [
  "/assets/uuid/2ea12fcf-f290-4475-b73a-dc071baac09f.jpg",
  "/assets/uuid/a13ee40d-9150-42e4-beeb-26438798bb1b.jpg",
  "/assets/uuid/eb2f93a3-e7da-4a6f-8f89-c76e7cb09496.jpg",
  "/assets/uuid/1d95318d-b82f-4a88-b0e6-1e1e8a474337.jpg",
  "/assets/uuid/c8cbc0af-64d5-4286-95b9-18a15838601e.jpg",
  "/assets/uuid/5bba058f-a503-47b0-9802-af53915a43ad.jpg",
];

const PALETTE = [
  { name: "Teal", hex: "#44D9C7" },
  { name: "Aqua", hex: "#70DADA" },
  { name: "Sky", hex: "#B0D2E6" },
  { name: "Pink", hex: "#FDBBC0" },
  { name: "Coral", hex: "#FD7947" },
  { name: "Orange", hex: "#FD9940" },
  { name: "Amber", hex: "#FDBA50" },
];

const CHAPTERS = [
  { id: "scope", tab: "Scope", eyebrow: "01 · Choose a service", title: "Pick your scope.", desc: "Start with complete branding, or just the piece you need — name, logo, graphics or guidelines." },
  { id: "brief", tab: "Brief", eyebrow: "02 · Your idea", title: "Describe the thing.", desc: "One sentence about what you're building and who it's for. That's the whole brief — Fluid does the rest." },
  { id: "direction", tab: "Direction", eyebrow: "03 · Visual direction", title: "Set the mood.", desc: "Pick a direction — minimal, futuristic, playful, luxury or organic. It steers every asset downstream." },
  { id: "name", tab: "Name", eyebrow: "04 · Name", title: "Name it.", desc: "Generated name candidates, scored and rendered as wordmarks. The strongest one rises to the top." },
  { id: "logo", tab: "Logo", eyebrow: "05 · Logo", title: "Draw the mark.", desc: "The chosen name becomes a logo mark with construction grid, clear-space and lockups." },
  { id: "kit", tab: "Brand kit", eyebrow: "06 · Brand system", title: "Lock the system.", desc: "Logo, palette, type, app icon, wordmark and guidelines assemble into one exportable brand kit." },
];

// Scroll distance each chapter occupies, in vh. The whole track is one
// pinned viewport plus this per chapter, so the section costs
// (100 + CHAPTER_SCROLL_VH * 6) / 100 viewports of page height.
//
// This is the dial that decides how the section *feels*: higher dwells longer
// on each chapter and reads closer to the original, lower moves briskly. It is
// bounded by the guardrails in e2e/homepage-conversion.spec.ts — no single
// element may exceed 4 viewports and the page may not exceed 8.
const CHAPTER_SCROLL_VH = 33;

function ScopeStage() {
  return (
    <div className="bf-services">
      <div className="svc svc-main">
        <span className="svc-main-info">
          <span className="svc-kicker"><span className="d" />Recommended</span>
          <span className="svc-title">Complete Branding</span>
          <span className="svc-desc">Strategy, naming, logo, palette, type &amp; guidelines — generated as one cohesive system.</span>
          <span className="svc-foot">7 assets · one identity</span>
        </span>
        <span className="svc-mosaic" aria-hidden="true">
          {SERVICE_MOSAIC.map((col, ci) => (
            <span className="mcol" key={ci}>
              {col.map((src) => <span className="m" key={src} style={{ backgroundImage: `url("${src}")` }} />)}
            </span>
          ))}
        </span>
      </div>
      <div className="bf-services-side">
        {SIDE_SERVICES.map((svc) => (
          <div className="svc" key={svc.title}>
            <span className="svc-preview" style={{ backgroundImage: `url("${svc.preview}")` }} aria-hidden="true" />
            <span className="svc-text">
              <span className="svc-title">{svc.title}</span>
              <span className="svc-sdesc">{svc.desc}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BriefStage() {
  return (
    <div className="bf-form">
      <span className="bf-form-kicker"><span className="d" />Complete Branding</span>
      <div className="bf-field is-focus">
        <span className="bf-typed">A branding agency powered by AI agents</span>
      </div>
      <span className="bf-next is-active"><span>Next</span><span className="arr">→</span></span>
    </div>
  );
}

function DirectionStage() {
  return (
    <div className="bf-dir">
      <div className="bf-dir-stage">
        <div className="bf-dir-view">
          <div className="bf-moods">
            {MOODS.map((mood) => (
              <div className={`mood${mood.name === "Organic" ? " is-chosen" : ""}`} key={mood.name}>
                <div className="mood-img" style={{ backgroundImage: `url("${mood.img}")` }} />
                <span className="mood-name">{mood.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="bf-dir-label is-locked">
        <span className="cap">Selected direction</span>
        <span className="val">Organic</span>
      </div>
    </div>
  );
}

function NameStage() {
  return (
    <div className="bf-names">
      {NAMES.map((name, i) => (
        <div className={`bf-name${i === 5 ? " win is-win" : ""}`} key={name}><span>{name}</span></div>
      ))}
    </div>
  );
}

function LogoStage() {
  return (
    <div className="bf-logo-explore">
      {LOGO_SKETCHES.map((src, i) => (
        <div className={`lx sketch${i === 5 ? " chosen" : ""}`} key={src}>
          <Image src={src} alt="" width={520} height={520} />
        </div>
      ))}
    </div>
  );
}

function KitStage() {
  return (
    <div className="bf-kit">
      <div className="kc" style={{ gridColumn: "span 4", gridRow: "span 2" }}>
        <span className="kc-cap">Logo</span>
        <div className="kc-body">
          <Image src="/assets/uuid/196c5943-6844-4354-8332-20ba6ce9042b.png" alt="" width={520} height={520} style={{ width: "64%", height: "auto" }} />
        </div>
      </div>
      <div className="kc" style={{ gridColumn: "span 8" }}>
        <span className="kc-cap">Palette</span>
        <div className="kc-body pal">
          {PALETTE.map((c) => (
            <div className="sw" key={c.hex}>
              <span className="dot" style={{ background: c.hex }} />
              <span className="nm">{c.name}</span>
              <span className="hx">{c.hex}</span>
            </div>
          ))}
          <div className="sw">
            <span className="dot ink" style={{ background: "#000" }} />
            <span className="nm">Ink</span>
            <span className="hx">#000000</span>
          </div>
        </div>
      </div>
      <div className="kc" style={{ gridColumn: "span 4" }}>
        <span className="kc-cap">Typography</span>
        <div className="kc-body fonts">
          <div className="frow">
            <span className="fglyph" style={{ fontFamily: "var(--font-display)", fontWeight: 800 }}>Aa</span>
            <span className="finfo"><b>Metropolis</b><i>Display</i></span>
          </div>
          <div className="frow">
            <span className="fglyph" style={{ fontFamily: "'Inter',sans-serif", fontWeight: 600 }}>Aa</span>
            <span className="finfo"><b>Inter</b><i>Body &amp; UI</i></span>
          </div>
        </div>
      </div>
      <div className="kc" style={{ gridColumn: "span 4" }}>
        <span className="kc-cap">App icon</span>
        <div className="kc-body iconwrap">
          <Image src="/assets/uuid/017aa8ad-23be-4e06-8f2c-0cea154cf47a.png" alt="" width={351} height={360} />
        </div>
      </div>
      <div className="kc" style={{ gridColumn: "span 8" }}>
        <span className="kc-cap">Wordmark</span>
        <div className="kc-body">
          <Image src="/assets/uuid/ff314af0-d60a-45f5-9c32-660e75675988.png" alt="" width={700} height={184} style={{ width: "62%", height: "auto" }} />
        </div>
      </div>
      <div className="kc" style={{ gridColumn: "span 4" }}>
        <span className="kc-cap">Guidelines</span>
        <div className="kc-body guide">
          <span className="gtitle">Brand<br />Guidelines</span>
          <span className="grule" />
          <span className="gmeta">PDF · 24pp</span>
        </div>
      </div>
    </div>
  );
}

const STAGES = [ScopeStage, BriefStage, DirectionStage, NameStage, LogoStage, KitStage];

export function BrandStory() {
  const [active, setActive] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);

  // Map scroll position over the track onto a chapter index. Runs on rAF so a
  // fast trackpad flick doesn't queue a layout read per wheel event.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    // Under reduced motion the track is `height: auto` and the pin is static,
    // so there is no travel to read: the tabs are the only control.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    const read = () => {
      frame = 0;
      const rect = track.getBoundingClientRect();
      const travel = track.offsetHeight - window.innerHeight;
      if (travel <= 0) return;
      const p = Math.min(Math.max(-rect.top / travel, 0), 1);
      const next = Math.min(Math.floor(p * CHAPTERS.length), CHAPTERS.length - 1);
      setActive((cur) => (cur === next ? cur : next));
    };
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(read);
    };

    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // Selecting a tab sets the chapter immediately, then moves the scroll
  // position to match so the two never disagree. The jump is instant rather
  // than smooth: a smooth scroll would let the scroll handler walk the state
  // through every intervening chapter on its way there.
  const select = (index: number) => {
    setActive(index);
    const track = trackRef.current;
    if (!track) return;
    const travel = track.offsetHeight - window.innerHeight;
    if (travel <= 0) return;
    // Aim at the middle of the chapter's band so it is unambiguously selected.
    const p = (index + 0.5) / CHAPTERS.length;
    // Not offsetTop: .story is a positioned offsetParent, so offsetTop is 0
    // here. The document-absolute top is what the scroll position needs.
    const trackTop = track.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: trackTop + travel * p, behavior: "auto" });
  };

  // Arrow-key traversal, per the ARIA tabs pattern.
  const onKeyDown = (e: React.KeyboardEvent) => {
    const last = CHAPTERS.length - 1;
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = active === last ? 0 : active + 1;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = active === 0 ? last : active - 1;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = last;
    if (next === null) return;
    e.preventDefault();
    select(next);
    tabsRef.current?.querySelectorAll<HTMLButtonElement>("[role=tab]")[next]?.focus();
  };

  const chapter = CHAPTERS[active];
  const Stage = STAGES[active];

  return (
    <section className="story" id="transform" data-dark="" aria-labelledby="story-heading">
      <div
        className="story-track"
        ref={trackRef}
        style={{ "--story-track": `${100 + CHAPTER_SCROLL_VH * CHAPTERS.length}vh` } as React.CSSProperties}
      >
        <div className="story-pin">
          <div className="story-inner">
            <div className="story-head sec-head">
              <span className="eyebrow sec-eyebrow">How it works</span>
              <h2 id="story-heading" className="story-heading">One sentence in. A whole identity out.</h2>
            </div>

            <div
              className="story-tabs"
              role="tablist"
              aria-label="How Fluid builds a brand"
              ref={tabsRef}
              onKeyDown={onKeyDown}
            >
              {CHAPTERS.map((c, i) => (
                <button
                  key={c.id}
                  role="tab"
                  id={`story-tab-${c.id}`}
                  aria-selected={i === active}
                  aria-controls={`story-panel-${c.id}`}
                  tabIndex={i === active ? 0 : -1}
                  className={`story-tab${i === active ? " is-active" : ""}`}
                  onClick={() => select(i)}
                >
                  <span className="story-tab-n">{String(i + 1).padStart(2, "0")}</span>
                  <span className="story-tab-label">{c.tab}</span>
                </button>
              ))}
            </div>

            <div
              className="story-panel"
              role="tabpanel"
              id={`story-panel-${chapter.id}`}
              aria-labelledby={`story-tab-${chapter.id}`}
              tabIndex={0}
            >
              {/* Keyed on the chapter so React remounts it and the fade-in
                  replays on every change, which is what reads as motion. */}
              <div className="story-fade" key={chapter.id}>
                <div className="story-copy">
                  <span className="story-eyebrow">{chapter.eyebrow}</span>
                  <h3 className="story-title">{chapter.title}</h3>
                  <p className="story-desc">{chapter.desc}</p>
                </div>
                <div className="story-stage">
                  <Stage />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
