"use client";

// Extracted from the original single-file Prototype.tsx as part of #175's
// route split. The code below is unchanged; only the import/export header
// around it is new.

import React, { type CSSProperties, type ReactNode } from "react";

interface SparkleProps {
  size?: number;
  color?: string;
  style?: CSSProperties;
}

export const Sparkle = ({ size = 14, color = 'currentColor', style }: SparkleProps) => (

// Tiny "✦" sparkle used to flag AI-generated content. Stroke-only,
// matches the Lucide style mentioned in the design system.
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
       strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/>
  </svg>
);

export const ArrowRight = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
);

export const PlusIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

// A pill-shaped tag with optional dot — used for status chips throughout
const tones = {
    neutral: { bg: 'var(--bg-sunken)', fg: 'var(--fg-2)', dot: null },
    live:    { bg: 'rgba(68,217,199,.22)', fg: '#0E6B5E', dot: '#44D9C7' },
    queued:  { bg: 'var(--bg-sunken)', fg: 'var(--fg-3)', dot: 'var(--fg-4)' },
    ai:      { bg: '#000', fg: '#fff', dot: null },
    coral:   { bg: 'rgba(253,121,71,.14)', fg: '#A8421F', dot: '#FD7947' },
    sky:     { bg: 'rgba(154,211,230,.34)', fg: '#2F6B83', dot: null },
} as const;

type ChipTone = keyof typeof tones;

interface ChipProps {
  children?: ReactNode;
  tone?: ChipTone;
  style?: CSSProperties;
}

export const Chip = ({ children, tone = 'neutral', style }: ChipProps) => {
  const t = tones[tone];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      fontSize: 11, fontWeight: 600, letterSpacing: 0,
      padding: '4px 9px', borderRadius: 999,
      background: t.bg, color: t.fg,
      whiteSpace: 'nowrap',
      ...style,
    }}>
      {t.dot && <span style={{width: 5, height: 5, borderRadius: 999, background: t.dot, boxShadow: tone==='live' ? '0 0 6px ' + t.dot : 'none'}}/>}
      {children}
    </span>
  );
};

// Used in agent log / streaming sections — a small ".thinking" dot pulse.
export const Thinking = () => (
  <span style={{display:'inline-flex', gap: 3, alignItems:'center'}}>
    <span className="td" style={{width:4,height:4,borderRadius:99,background:'currentColor',opacity:.6,animation:'tdot 1.2s -.0s infinite'}}/>
    <span className="td" style={{width:4,height:4,borderRadius:99,background:'currentColor',opacity:.6,animation:'tdot 1.2s -.2s infinite'}}/>
    <span className="td" style={{width:4,height:4,borderRadius:99,background:'currentColor',opacity:.6,animation:'tdot 1.2s -.4s infinite'}}/>
  </span>
);

// ---- Brand showcase card ----------------------------------------------
// Reusable empty state — shown when a screen has no real content yet.
interface EmptyStateProps {
  title: string;
  body: string;
  ctaLabel?: string;
  onCta?: () => void;
}

export const AEmptyState = ({ title, body, ctaLabel, onCta }: EmptyStateProps) => (
  <div style={{
    border: '1px dashed var(--line-strong)', borderRadius: 20,
    padding: '56px 40px', display: 'flex', flexDirection: 'column',
    alignItems: 'center', textAlign: 'center', gap: 12, background: 'var(--bg-elev)',
  }}>
    <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, letterSpacing: '-0.02em', margin: 0, color: '#000' }}>{title}</h3>
    <p style={{ fontSize: 14.5, color: 'var(--fg-2)', maxWidth: 420, lineHeight: 1.5, margin: 0 }}>{body}</p>
    {ctaLabel && (
      <button onClick={onCta} style={{ marginTop: 8, padding: '11px 18px', borderRadius: 12, background: '#000', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <PlusIcon size={14} /> {ctaLabel}
      </button>
    )}
  </div>
);

if (typeof document !== 'undefined' && !document.getElementById('shared-kf')) {
  const s = document.createElement('style');
  s.id = 'shared-kf';
  s.textContent = `
    @keyframes tdot { 0%,80%,100% { transform: translateY(0); opacity:.3 } 40% { transform: translateY(-2px); opacity: 1 } }
  `;
  document.head.appendChild(s);
}
