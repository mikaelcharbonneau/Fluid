"use client";

// Extracted from the original single-file Prototype.tsx as part of #175's
// route split. The code below is unchanged; only the import/export header
// around it is new.

import React from "react";
import Image from "next/image";

// ══════════════════════════════════════════════════════════════════════
// Brand-kit export — all client-side, no dependencies. Downloads the logo
// (SVG/PNG), the palette as CSS variables, and a self-contained brand-sheet
// HTML file that gathers everything (printable to PDF).
// ══════════════════════════════════════════════════════════════════════
export function downloadBlob(filename: any, blob: any) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function kitSlug(s: any) {
  return String(s || 'brand').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'brand';
}

export function escHtml(s: any) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } as any)[m] || m);
}

// The user's chosen logo concept's SVG (or the first available).
export function pickLogoSvg(b: any) {
  const logos = (b.data && b.data.logos) || [];
  if (!logos.length) return null;
  const pick = logos.find((l: any) => l.name === b.logo_choice) || logos[0];
  return pick ? pick.svg : null;
}

// Rasterize an SVG string to a PNG Blob at `size`px via an offscreen canvas.
export function svgToPngBlob(svg: any, size: any) {
  return new Promise<Blob>((resolve, reject) => {
    // `window.Image` explicitly: this module also imports next/image as
    // `Image`, and the bare `new Image()` would resolve to that component.
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas 2D context unavailable')); return; }
      ctx.clearRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('PNG export failed'))), 'image/png');
    };
    img.onerror = () => reject(new Error('Could not load the logo for PNG export'));
    img.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  });
}

// A brand only "has a name" once one is explicitly chosen on the name step
// (name_choice). Before that, b.name holds a brief-derived placeholder
// (deriveBrandName takes the first few words of the brief), which isn't a
// real brand name — so those read a clean "Untitled" until the user picks one.
// The brand's real, user-chosen name, or null if none has been chosen yet.
//
// `name_choice` is the field of record. `name` is ambiguous: chooseName()
// writes the chosen name into both, but until one is chosen `name` holds a
// placeholder derived from the first words of the brief — so it can't be
// trusted blindly, or a brief fragment ends up presented as the brand's name.
//
// It can be trusted when it *differs* from that placeholder, which is what
// rescues brands saved while a debounce race was dropping name_choice: for
// those, `name` is the only surviving copy of the chosen name.
export function resolveBrandName(b: any) {
  const chosen = ((b && b.name_choice) || '').trim();
  if (chosen && chosen.toLowerCase() !== 'untitled brand') return chosen;
  const name = ((b && b.name) || '').trim();
  if (!name || name.toLowerCase() === 'untitled brand') return null;
  return name === deriveBrandName((b && b.brief) || '') ? null : name;
}

export function brandDisplayName(b: any) {
  return resolveBrandName(b) || 'Untitled';
}

// True for any brand built with the brand-kit conversation (src/app/app/chat),
// whether it's still mid-conversation (`brandkitDraft`) or finished
// (`brandkit`) — both belong at the chat URL, never the legacy hash-router
// wizard below, which doesn't know how to resume that flow's steps.
export function isBrandKitBrand(b: any) {
  return !!(b.data && (b.data.brandkit || b.data.brandkitDraft));
}

// #rrggbb / #rgb → "rgba(r,g,b,a)". Falls back to a neutral ink tint.
function hexToRgba(hex: any, a: any) {
  let h = String(hex || '').trim().replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length !== 6 || /[^0-9a-fA-F]/.test(h)) return 'rgba(20,20,20,' + a + ')';
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const bl = parseInt(h.slice(4, 6), 16);
  return 'rgba(' + r + ',' + g + ',' + bl + ',' + a + ')';
}

// The card's top visual, driven entirely by what the brand actually has:
//   • logo  → the chosen mark on a light tile (marks are drawn for light bg)
//   • palette, no logo → the real brand colors as the backdrop
//   • palette present → a thin swatch strip so colors always show
//   • neither → a neutral surface (never the Fluid gradient — that's Fluid's
//     mark, not the user's brand)
export const BA_CardVisual = ({ brand, height = 132 }: any) => {
  // A one-shot brand-kit board is already a finished piece of art — show it
  // directly rather than falling back to the svg/palette/initial tile below.
  const boardImage = brand.data && brand.data.brandkit && brand.data.brandkit.imageUrl;
  const svg = pickLogoSvg(brand);
  const colors = (((brand.data || {}).palette || {}).colors) || [];
  const hasColors = colors.length > 0;
  const initial = brandDisplayName(brand).charAt(0).toUpperCase();
  // Scale the mark tile and initial with the header height so the same visual
  // works on both the Brands library (132) and the smaller Home cards (96).
  const tile = Math.round(height * 0.56);
  const initialSize = Math.round(height * 0.30);
  const stripH = height < 110 ? 5 : 6;

  if (boardImage) {
    return (
      <div style={{ position: 'relative', height, background: 'var(--bg-sunken)', overflow: 'hidden' }}>
        {/* Model-generated, so its intrinsic size is not known here; the
            wrapper fixes the height, so `fill` is the right shape. */}
        <Image
          src={boardImage}
          alt={brandDisplayName(brand) + ' brand kit board'}
          fill
          sizes="(max-width: 1040px) 100vw, 50vw"
          style={{ objectFit: 'cover', objectPosition: 'top', display: 'block' }}
        />
      </div>
    );
  }

  let background;
  if (svg) {
    background = hasColors ? hexToRgba(colors[0].hex, 0.14) : 'var(--bg-sunken)';
  } else if (hasColors) {
    const stops = colors.slice(0, 3).map((c: any) => c.hex);
    background = stops.length >= 2 ? 'linear-gradient(135deg, ' + stops.join(', ') + ')' : stops[0];
  } else {
    background = 'var(--bg-sunken)';
  }

  return (
    <div style={{ position: 'relative', height, background, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {svg ? (
        <div style={{ width: tile, height: tile, borderRadius: Math.round(tile * 0.22), background: '#fff', boxShadow: '0 2px 10px rgba(0,0,0,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <SvgMark svg={svg} size={Math.round(tile * 0.7)} />
        </div>
      ) : (
        <span style={{
          fontFamily: 'var(--font-display)', fontSize: initialSize, fontWeight: 700, letterSpacing: '-0.03em',
          color: hasColors ? '#fff' : 'var(--fg-3)',
          textShadow: hasColors ? '0 1px 6px rgba(0,0,0,.28)' : 'none',
        }}>{initial}</span>
      )}
      {svg && hasColors && (
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, display: 'flex', height: stripH }}>
          {colors.slice(0, 6).map((c: any, i: any) => (
            <div key={i} style={{ flex: 1, background: c.hex }} />
          ))}
        </div>
      )}
    </div>
  );
};

// Render model-generated SVG safely: an <img> data-URI can't execute scripts,
// unlike innerHTML. The SVG is also sanitized server-side (defense in depth).
//
// #171 exception — deliberately NOT next/image. Optimizing SVG requires
// `images.dangerouslyAllowSVG`, which turns the optimizer loose on SVG
// markup; doing that for *model-generated* SVG is exactly the case the flag
// is named after. There is also nothing to win: this is a vector at a fixed
// square size, already resolution-independent, and it is a data URI, so
// there is no network fetch to optimize. Width and height are set, so it
// still reserves its box.
export const SvgMark = ({ svg, size = 120, bg }: any) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img
    src={'data:image/svg+xml;utf8,' + encodeURIComponent(svg)}
    alt="Logo concept"
    width={size} height={size}
    style={{ width: size, height: size, display: 'block', background: bg || 'transparent', borderRadius: 8 }}
  />
);

// Load a Google Fonts family once (idempotent by href). Weights are omitted so
// the request never 400s on a family that lacks a requested weight; the browser
// synthesizes bolder weights for the specimen.
export function ensureGoogleFont(family: any) {
  if (!family || typeof document === 'undefined') return;
  const href = 'https://fonts.googleapis.com/css2?family=' +
    encodeURIComponent(family).replace(/%20/g, '+') + '&display=swap';
  if (document.querySelector('link[data-gfont="' + family + '"]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  link.setAttribute('data-gfont', family);
  document.head.appendChild(link);
}

export const FONT_FALLBACK = {
  'serif': 'Georgia, serif',
  'sans-serif': 'system-ui, sans-serif',
  'display': 'system-ui, sans-serif',
  'monospace': 'ui-monospace, monospace',
};

// Until the name step is wired up, derive a readable brand name from the brief
// so saved brands don't all read "Untitled brand".
export function deriveBrandName(brief: any) {
  const words = String(brief || '').trim().split(/\s+/).filter(Boolean).slice(0, 4);
  if (words.length === 0) return 'Untitled brand';
  const s = words.join(' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

