"use client";

// Extracted from the original single-file Prototype.tsx as part of #175's
// route split. The code below is unchanged; only the import/export header
// around it is new.

import React from "react";
import Image from "next/image";
import { COLLAGE_DIMENSIONS } from "./collage-dimensions";
import { CARD_BUTTON_RESET } from "./a11y";
import { __assets } from "./assets";
import { ArrowRight } from "./ui";

// ------------------------------------------------------------------
// 03-collage
// ------------------------------------------------------------------
// =====================================================================
// BrandCollage — dynamic vertical-scrolling collage of brand work.
//
// Lives in the black "From idea to identity" hero. THREE columns of real
// brand assets in varied formats and aspect ratios drift continuously:
//   • column 1 scrolls DOWN
//   • column 2 scrolls UP
//   • column 3 scrolls DOWN
// Columns run at slightly different speeds with staggered phase, so the
// composition reads as a curated, ever-moving collage rather than a grid.
// Cards fade softly into the black at the top and bottom edges via a mask.
// =====================================================================

// Every brand image, with its column assignment. Interleaved 1-2-3-1-2-3…
// so each column carries a balanced mix of portrait / landscape / square.
const COLLAGE_IMAGES = Array.from({ length: 24 }, (_, i) => ({
  src: `${__assets['assets/collage/brand-' + String(i + 1).padStart(2, '0') + '.png']}`,
  ...COLLAGE_DIMENSIONS[i + 1],
}));

const COL_1 = [0, 3, 6, 9, 12, 15, 18, 21].map((i) => COLLAGE_IMAGES[i]);

const COL_2 = [1, 4, 7, 10, 13, 16, 19, 22].map((i) => COLLAGE_IMAGES[i]);

const COL_3 = [2, 5, 8, 11, 14, 17, 20, 23].map((i) => COLLAGE_IMAGES[i]);

// ---- A single brand card --------------------------------------------
const BrandImgCard = ({ image }: any) => (
  <Image
    src={image.src}
    alt=""
    width={image.width}
    height={image.height}
    draggable={false}
    style={{
      display: 'block', width: '100%', height: 'auto', borderRadius: 12,
      boxShadow: '0 10px 26px rgba(0,0,0,.34), inset 0 0 0 1px rgba(255,255,255,.06)',
    }}
  />
);

// ---- One auto-scrolling column ---------------------------------------
// Renders its cards twice and drifts forever. The exact loop distance is
// re-measured whenever layout changes (e.g. images finish loading):
//   shift = (scrollHeight + gap) / 2
// which lands copy 2 precisely where copy 1 began — a seamless loop.
// `down` plays the keyframe in reverse so the stream travels downward.
const ScrollColumn = ({ images, gap = 12, speed = 24, down = false, phase = 0 }: any) => {
  const ref = React.useRef<any>(null);
  const [shift, setShift] = React.useState(0);
  // Measure the loop distance exactly ONCE, after every image has loaded so
  // scrollHeight is final. We deliberately never re-measure afterwards —
  // reassigning the `animation` shorthand would restart the keyframe each
  // time and freeze the scroll at currentTime 0.
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let cancelled = false;
    const imgs = Array.from(el.querySelectorAll('img'));
    const measure = () => {
      if (cancelled) return;
      const m = Math.round((el.scrollHeight + gap) / 2);
      if (m > 0) setShift(m);
    };
    const waits = imgs.map((img: any) =>
      img.complete && img.naturalWidth
        ? Promise.resolve()
        : new Promise((res) => { img.onload = img.onerror = res; })
    );
    Promise.all(waits).then(measure);
    return () => { cancelled = true; };
  }, [gap]);
  const dur = shift ? shift / speed : 20;
  // Negative delay offsets each column's starting phase so they never align.
  const delay = shift ? -(phase * dur) : 0;
  const cards = images.map((image: any, i: any) => <BrandImgCard key={i} image={image} />);
  return (
    <div
      ref={ref}
      className="collage-col"
      style={{
        flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap,
        willChange: 'transform',
        '--shift': `-${shift}px`,
        animation: shift
          ? `collageScroll ${dur}s linear ${delay}s infinite ${down ? 'reverse' : 'normal'}`
          : 'none',
      } as React.CSSProperties}
    >
      {cards}
      {cards}
    </div>
  );
};

// Soft fade mask applied to the collage box. Only the TOP and BOTTOM edges
// fade — the cards quietly dissolve into the black as they scroll in and
// out. The left and right edges get a GENTLE fade too: the columns are
// inset (inner flex padding) so each card's drop shadow falls into empty
// space, and this soft horizontal mask fades only the outer ~26px so the
// shadow melts into the background instead of being clipped at a hard
// rectangular edge. Both masks are intersected so all four edges read
// soft. `maskComposite: intersect` is the modern syntax; the WebKit
// `source-in` keyword is the legacy equivalent for older Safari.
const FADE_V = 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.18) 6%, rgba(0,0,0,0.6) 13%, #000 22%, #000 78%, rgba(0,0,0,0.6) 87%, rgba(0,0,0,0.18) 94%, transparent 100%)';

const FADE_H = 'linear-gradient(to right, transparent 0%, #000 7%, #000 93%, transparent 100%)';

// ---- The collage ------------------------------------------------------
export const BrandCollage = () => (
  <div style={{
    flex: '0 0 432px', width: 432, height: 312, position: 'relative', alignSelf: 'center',
    overflow: 'hidden',
    WebkitMaskImage: `${FADE_V}, ${FADE_H}`,
    WebkitMaskComposite: 'source-in',
    maskImage: `${FADE_V}, ${FADE_H}`,
    maskComposite: 'intersect',
  }}>
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '0 20px' }}>
      <ScrollColumn images={COL_1} speed={22} down={true}  phase={0.0} />
      <ScrollColumn images={COL_2} speed={26} down={false} phase={0.4} />
      <ScrollColumn images={COL_3} speed={20} down={true}  phase={0.7} />
    </div>
  </div>
);

// ---- Quick-start visual moods -------------------------------------------
// A one-shot generator has no "logo-only" vs "full brand" distinction
// anymore — every run produces the same board — so these shortcut cards
// pre-select one of the brandkit skill's named visual modes instead of a
// partial flow. `?mode=<id>` is read by BrandChat.tsx to preselect the chip.
export const QUICK_VISUAL_MODES = [
  {
    id: 'minimal', title: 'Minimal', sub: 'Negative space, one accent color, precise and confident.',
    preview: 'assets/min/preview-rebranding.jpg', previewBg: '#F3F3F4',
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3" /></svg>,
  },
  {
    id: 'playful', title: 'Playful', sub: 'Saturated color, chunky shapes, energetic and fun.',
    preview: 'assets/min/preview-logo.jpg', previewBg: '#EC4C34',
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z" /></svg>,
  },
  {
    id: 'luxury', title: 'Luxury', sub: 'Serif wordmark, embossing, tasteful and expensive.',
    preview: 'assets/min/preview-name.jpg', previewBg: '#2A2420',
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 7 4 4 20 4 20 7" /><line x1="9" y1="20" x2="15" y2="20" /><line x1="12" y1="4" x2="12" y2="20" /></svg>,
  },
  {
    id: 'futuristic', title: 'Futuristic', sub: 'Electric accent, sharp geometry, advanced and precise.',
    preview: 'assets/min/preview-guidelines.jpg', previewBg: '#0E0F12',
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" /></svg>,
  },
];

// ---- Quick path card — focus on one thing ------------------------------
export const QuickPath = ({ title, sub, icon, preview, previewBg, previewPos, customPreview, route, onClick }: any) =>
<button type="button" data-route={route} onClick={onClick} style={{
  ...CARD_BUTTON_RESET,
  background: 'var(--bg-elev)', borderRadius: 16,
  boxShadow: 'var(--shadow-xs), inset 0 0 0 1px var(--line)',
  display: 'flex', flexDirection: 'column', cursor: 'pointer', overflow: 'hidden'
}}>
    <div style={{
    height: 116, background: previewBg || 'var(--bg-sunken)',
    position: 'relative', overflow: 'hidden', boxShadow: 'inset 0 -1px 0 var(--line)'
  }}>
      {customPreview ||
    <Image src={preview} alt="" draggable={false} fill sizes="(max-width: 900px) 100vw, 33vw" style={{
      objectFit: 'cover',
      objectPosition: previewPos || 'center', display: 'block'
    }} />
    }
    </div>
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
        width: 28, height: 28, borderRadius: 8, background: 'var(--bg-sunken)', flex: '0 0 28px',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-2)'
      }}>{icon}</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, letterSpacing: '-0.015em', color: 'var(--fg-1)' }}>{title}</div>
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--fg-3)', lineHeight: 1.45 }}>{sub}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--fg-2)', marginTop: 'auto', paddingTop: 6 }}>
        Start <ArrowRight size={11} />
      </div>
    </div>
  </button>;

