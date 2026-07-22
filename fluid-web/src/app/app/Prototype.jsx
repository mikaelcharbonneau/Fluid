"use client";
/* eslint-disable */
// @ts-nocheck
// =====================================================================
// Fluid — Interactive product prototype (ported verbatim from the
// Claude Design export). All screens share one module scope, exactly as
// the original concatenated <script type="text/babel"> bundle did.
// Imported with { ssr: false } so top-level window writes run client-only.
// =====================================================================
import React from "react";

// Two source files declare the bare `const { useState } = React` (and the
// bootstrap adds useEffect); in a single shared scope those collide, so we
// hoist them here once and strip the bare redeclarations below. The other
// screens use aliased destructures (useAState, useBAState, ...) which are
// left untouched.
const { useState, useEffect } = React;

// Asset resolver — logical bundle paths live under /public/assets/<path>.
// Mirrors the original window.__assets Proxy (path -> inlined blob URL).
const __assets = new Proxy({}, {
  get(_t, key) {
    return typeof key === "string" ? "/assets/" + key : undefined;
  },
});


// ------------------------------------------------------------------
// 01-shared
// ------------------------------------------------------------------
// Shared bits used across all three direction prototypes.
// All components are written to `window` at the bottom because each
// `<script type="text/babel">` gets its own transform scope.

// Uses the same wordmark file as the marketing site so the two never drift.
const FluidWordmark = ({ height = 22, color = 'ink' }) => (
  <img
    className="fl-wordmark"
    src={color === 'mono' ? __assets['assets/min/fluid-wordmark-mono.png'] : __assets['uuid/97b97e78-4145-428a-9c6f-c0ff3d3cb43d.png']}
    alt="Fluid"
    style={{ height, width: 'auto', display: 'block' }}
  />
);

// "F." compact lockup — used where the full FLUID. mark is too wide.
const FluidCompact = ({ size = 28 }) => (
  <div style={{
    width: size, height: size, borderRadius: 8,
    background: '#000', color: '#fff',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'var(--font-display)', fontWeight: 900,
    letterSpacing: '-0.04em', fontSize: size * 0.5,
  }}>F.</div>
);

// Tiny "✦" sparkle used to flag AI-generated content. Stroke-only,
// matches the Lucide style mentioned in the design system.
const Sparkle = ({ size = 14, color = 'currentColor', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
       strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/>
  </svg>
);

const ChevronRight = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);
const ArrowRight = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
);
const PlusIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const SearchIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

// Generic ribbon strip — small inline copy of the brand mark, used for
// progress indicators / dividers. Renders the gradient through clip-path so
// it can be scaled in CSS without dragging in another <img>.
const RibbonStrip = ({ width = 200, height = 6, opacity = 1 }) => (
  <div style={{
    width, height, opacity,
    background: 'url("' + __assets['assets/fluid-gradient.jpg'] + '") center / cover',
    borderRadius: height,
    maskImage: 'linear-gradient(90deg, transparent 0, #000 12%, #000 88%, transparent 100%)',
    WebkitMaskImage: 'linear-gradient(90deg, transparent 0, #000 12%, #000 88%, transparent 100%)',
  }}/>
);

// A pill-shaped tag with optional dot — used for status chips throughout
const Chip = ({ children, tone = 'neutral', style }) => {
  const tones = {
    neutral: { bg: 'var(--bg-sunken)', fg: 'var(--fg-2)', dot: null },
    live:    { bg: 'rgba(68,217,199,.22)', fg: '#0E6B5E', dot: '#44D9C7' },
    queued:  { bg: 'var(--bg-sunken)', fg: 'var(--fg-3)', dot: 'var(--fg-4)' },
    ai:      { bg: '#000', fg: '#fff', dot: null },
    coral:   { bg: 'rgba(253,121,71,.14)', fg: '#A8421F', dot: '#FD7947' },
    sky:     { bg: 'rgba(154,211,230,.34)', fg: '#2F6B83', dot: null },
  };
  const t = tones[tone] || tones.neutral;
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

// Palette swatch row — eight colors, optional labels.
const Palette = ({ colors, size = 24, gap = 6, radius = 6 }) => (
  <div style={{ display: 'flex', gap }}>
    {colors.map((c, i) => (
      <div key={i} style={{
        width: size, height: size, borderRadius: radius,
        background: c, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.06)',
      }}/>
    ))}
  </div>
);

const FLUID_PALETTE = ['#44D9C7','#70DADA','#B0D2E6','#FDBBC0','#FD7947','#FD9940','#FDBA50','#000000'];

// Used in agent log / streaming sections — a small ".thinking" dot pulse.
const Thinking = () => (
  <span style={{display:'inline-flex', gap: 3, alignItems:'center'}}>
    <span className="td" style={{width:4,height:4,borderRadius:99,background:'currentColor',opacity:.6,animation:'tdot 1.2s -.0s infinite'}}/>
    <span className="td" style={{width:4,height:4,borderRadius:99,background:'currentColor',opacity:.6,animation:'tdot 1.2s -.2s infinite'}}/>
    <span className="td" style={{width:4,height:4,borderRadius:99,background:'currentColor',opacity:.6,animation:'tdot 1.2s -.4s infinite'}}/>
  </span>
);
// Inject thinking-dot keyframes once.
if (typeof document !== 'undefined' && !document.getElementById('shared-kf')) {
  const s = document.createElement('style');
  s.id = 'shared-kf';
  s.textContent = `
    @keyframes tdot { 0%,80%,100% { transform: translateY(0); opacity:.3 } 40% { transform: translateY(-2px); opacity: 1 } }
  `;
  document.head.appendChild(s);
}

Object.assign(window, {
  FluidWordmark, FluidCompact, Sparkle, ChevronRight, ArrowRight, PlusIcon, SearchIcon,
  RibbonStrip, Chip, Palette, FLUID_PALETTE, Thinking,
});

// ------------------------------------------------------------------
// 02-canvas
// ------------------------------------------------------------------
// =====================================================================
// Direction A · Studio Canvas
//
// Philosophy:
//   - No wizard rail eating 1/3 of the screen. All five inputs live as
//     equal cards on one board.
//   - Fluid threads them together: as one card fills, others light up
//     with proposals. The bottom dock shows what the agent is doing now.
//   - Background gradient ribbons are gone. The ribbon mark only appears
//     where it earns its place — the hero of A4, the AI moment on A3.
// =====================================================================


// ---------- App shell shared across A2/A3/A4 -----------------------------
// Top dock + slim icon rail + main area. Frame is 1440×900; the dock is
// 60px, the rail is 60px, leaving a 1380×840 working surface.

const ARailIcon = ({ d, active, label }) => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
    padding: '14px 0', position: 'relative',
    color: active ? 'var(--fg-1)' : 'var(--fg-3)',
  }}>
    {active && <div style={{position:'absolute',left:0,top:18,bottom:18,width:2,background:'#000',borderRadius:2}}/>}
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
    <span style={{fontSize: 9.5, fontWeight: 600, letterSpacing: 0.04, color: active ? 'var(--fg-2)' : 'var(--fg-4)'}}>{label}</span>
  </div>
);

// Token balance pill in the top bar. Colors shift as the balance runs low,
// and clicking it jumps straight to Settings → Billing to top up.
const TokenPill = ({ billing }) => {
  const { navigate } = useRouter();
  if (!billing) return null;
  const balance = typeof billing.balance === 'number' ? billing.balance : 0;
  const low = balance <= 3;      // not enough for another asset generation
  const empty = balance <= 0;
  const tone = empty
    ? { bg: 'rgba(230,70,70,.12)', line: 'rgba(230,70,70,.4)', fg: '#B42318' }
    : low
    ? { bg: 'rgba(214,140,20,.12)', line: 'rgba(214,140,20,.4)', fg: '#9A6400' }
    : { bg: 'var(--bg-elev)', line: 'var(--line)', fg: 'var(--fg-2)' };
  const goBilling = () => {
    if (typeof window !== 'undefined') window.__fluidSettingsTab = 'billing';
    navigate('settings');
  };
  return (
    <button
      onClick={goBilling}
      title={empty ? 'Out of tokens — top up' : balance + ' tokens left · click to manage billing'}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 7,
        padding: '6px 12px', borderRadius: 999,
        background: tone.bg, boxShadow: 'inset 0 0 0 1px ' + tone.line,
        fontSize: 12, fontWeight: 600, color: tone.fg, cursor: 'pointer', border: 0,
      }}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: '0 0 13px' }}>
        <circle cx="12" cy="12" r="9"/><path d="M12 7v10M9 9.5a2.5 2 0 0 1 5 0c0 1.5-2 1.8-2 2.5M9 14.5a2.5 2 0 0 0 5 0"/>
      </svg>
      {empty ? 'Out of tokens' : balance}
    </button>
  );
};

// Raised when a generation is refused for lack of tokens. A single fixed
// banner (rather than five per-step error variants) with a direct path to top up.
const NoTokensBanner = ({ onClose }) => {
  const { navigate } = useRouter();
  const goBilling = () => {
    if (typeof window !== 'undefined') window.__fluidSettingsTab = 'billing';
    onClose();
    navigate('settings');
  };
  return (
    <div style={{
      position: 'fixed', left: '50%', bottom: 24, transform: 'translateX(-50%)',
      zIndex: 9999, display: 'flex', alignItems: 'center', gap: 16,
      padding: '12px 14px 12px 18px', borderRadius: 14,
      background: '#111', color: '#fff', boxShadow: '0 12px 40px rgba(0,0,0,.28)',
      fontSize: 13, maxWidth: 'calc(100vw - 32px)',
    }}>
      <span>You’re out of tokens. Subscribe for a monthly refill to keep generating.</span>
      <button onClick={goBilling} style={{ padding: '8px 14px', borderRadius: 9, background: '#fff', color: '#111', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', border: 0, whiteSpace: 'nowrap' }}>Manage billing</button>
      <button onClick={onClose} aria-label="Dismiss" style={{ background: 'transparent', border: 0, color: 'rgba(255,255,255,.6)', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 2px' }}>×</button>
    </div>
  );
};

const AShell = ({ children, activeNav = 'brands', breadcrumb }) => {
  const { user, billing } = useBrandDraft();
  return (
  <div className="ab" style={{display:'flex',flexDirection:'column'}}>
    {/* Top dock */}
    <header style={{
      height: 60, flex: '0 0 60px',
      display: 'flex', alignItems: 'center', gap: 20,
      padding: '0 24px',
      borderBottom: '1px solid var(--line)',
      background: 'var(--bg)',
      position: 'relative', zIndex: 2,
    }}>
      <FluidWordmark height={38}/>
      <div style={{width:1, height:28, background:'var(--line)'}}/>
      <nav style={{display:'flex',alignItems:'center',gap:6,fontSize:13,color:'var(--fg-3)'}}>
        {breadcrumb.map((b,i) => (
          <React.Fragment key={i}>
            {i>0 && <ChevronRight size={12}/>}
            <span style={{color: i === breadcrumb.length-1 ? 'var(--fg-1)' : 'var(--fg-3)', fontWeight: i === breadcrumb.length-1 ? 600 : 500}}>{b}</span>
          </React.Fragment>
        ))}
      </nav>

      <div style={{flex:1}}/>

      <button style={{
        display:'inline-flex',alignItems:'center',gap:8,
        padding:'6px 12px',borderRadius:999,
        background:'var(--bg-elev)',boxShadow:'inset 0 0 0 1px var(--line)',
        fontSize:12,fontWeight:500,color:'var(--fg-2)'
      }}>
        <SearchIcon size={12}/> Search brands, assets…
        <span style={{marginLeft:18,padding:'2px 6px',borderRadius:5,background:'var(--bg-sunken)',fontSize:10,fontFamily:'var(--font-mono)',color:'var(--fg-3)'}}>⌘K</span>
      </button>
      <TokenPill billing={billing}/>
      <div title={(user && (user.name || user.email)) || ''} style={{width: 26, height: 26, borderRadius: 999, background: '#000', color:'#fff', fontSize: 11, fontWeight: 700, display:'inline-flex',alignItems:'center',justifyContent:'center'}}>{(user && user.initial) || '·'}</div>
    </header>

    {/* Body: rail + main */}
    <div style={{flex:1, display:'flex', minHeight:0}}>
      {/* Slim icon rail */}
      <aside style={{
        width: 60, flex:'0 0 60px',
        borderRight: '1px solid var(--line)',
        background: 'var(--bg)',
        display:'flex',flexDirection:'column',
      }}>
        <ARailIcon active={activeNav==='home'} label="Home" d={<><path d="M3 12 12 4l9 8"/><path d="M5 10v10h14V10"/></>}/>
        <ARailIcon active={activeNav==='brands'} label="Brands" d={<><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>}/>
        <ARailIcon active={activeNav==='assets'} label="Assets" d={<><polygon points="12 2 22 8.5 12 15 2 8.5 12 2"/><polyline points="2 15.5 12 22 22 15.5"/></>}/>
        <ARailIcon active={activeNav==='guides'} label="Guides" d={<><path d="M4 4h16v16H4z"/><path d="M9 4v16M14 4v16"/></>}/>
        <div style={{flex:1}}/>
        <ARailIcon active={activeNav==='settings'} label="Settings" d={<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>}/>
      </aside>

      <main style={{flex:1, minWidth:0, overflow:'hidden', position:'relative'}}>
        {children}
      </main>
    </div>
  </div>
  );
};

// =====================================================================
// A1 · Brands library — empty state
// Editorial, generous, no ribbon clip-art. One coral CTA card on the
// left; three "start from…" entry-cards on the right to give the page
// content rather than an empty void.
// =====================================================================

const StartCard = ({ title, sub, icon }) => (
  <div style={{
    background: 'var(--bg-elev)', borderRadius: 16, padding: 18,
    boxShadow: 'var(--shadow-xs), inset 0 0 0 1px var(--line)',
    display: 'flex', flexDirection: 'column', gap: 10, minHeight: 138,
  }}>
    <div style={{
      width: 28, height: 28, borderRadius: 8,
      background: 'var(--bg-sunken)',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      color: 'var(--fg-2)',
    }}>{icon}</div>
    <div style={{marginTop:'auto'}}>
      <div style={{fontFamily:'var(--font-display)', fontSize:15, fontWeight:700, letterSpacing:'-0.015em', color: 'var(--fg-1)'}}>{title}</div>
      <div style={{fontSize: 12.5, color:'var(--fg-3)', marginTop: 4, lineHeight: 1.45}}>{sub}</div>
    </div>
  </div>
);

// Template card — a polished starter. Each card shows a tinted preview
// block (with a stylized mark or typographic sample), category eyebrow,
// name, tagline, and a 4-swatch palette strip.
const TemplateCard = ({ category, name, tagline, palette, mood, mark }) => (
  <div style={{
    background: 'var(--bg-elev)', borderRadius: 16,
    boxShadow: 'var(--shadow-xs), inset 0 0 0 1px var(--line)',
    overflow: 'hidden', display: 'flex', flexDirection: 'column',
    cursor: 'pointer',
  }}>
    <div style={{
      height: 132, background: mood.bg, color: mood.fg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-display)', fontWeight: mark.weight,
      fontSize: mark.size, letterSpacing: mark.tracking, lineHeight: 1,
      position: 'relative',
    }}>
      {mark.text}
      {mark.dot && <span style={{color: mark.dotColor || mood.fg}}>.</span>}
    </div>
    <div style={{padding: '14px 16px 16px', display:'flex', flexDirection:'column', gap:8}}>
      <div style={{fontSize: 10.5, color: 'var(--fg-3)', letterSpacing: '0.06em', fontWeight: 600, textTransform: 'uppercase'}}>{category}</div>
      <div style={{fontFamily:'var(--font-display)', fontWeight: 700, fontSize: 15, letterSpacing: '-0.018em', color: 'var(--fg-1)', lineHeight: 1}}>{name}</div>
      <div style={{fontSize: 11.5, color: 'var(--fg-3)', lineHeight: 1.4}}>{tagline}</div>
      <div style={{display:'flex', gap: 4, marginTop: 4}}>
        {palette.map((c, i) => (
          <div key={i} style={{flex: 1, height: 14, borderRadius: 4, background: c, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.06)'}}/>
        ))}
      </div>
    </div>
  </div>
);

// Community card — a brand someone made with Fluid. Shows a thumbnail,
// brand name + author, kit summary (3 swatches + type sample).
const CommunityCard = ({ name, author, when, mood, mark, palette, type }) => (
  <div style={{
    background: 'var(--bg-elev)', borderRadius: 16,
    boxShadow: 'var(--shadow-xs), inset 0 0 0 1px var(--line)',
    overflow: 'hidden', display: 'flex', flexDirection: 'column',
    cursor: 'pointer',
  }}>
    <div style={{
      height: 110, background: mood.bg, color: mood.fg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-display)', fontWeight: mark.weight,
      fontSize: mark.size, letterSpacing: mark.tracking, lineHeight: 1,
    }}>{mark.text}{mark.dot && <span style={{color: mark.dotColor}}>.</span>}</div>
    <div style={{padding: '12px 14px 14px', display:'flex', flexDirection:'column', gap:8}}>
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:8}}>
        <div style={{minWidth:0}}>
          <div style={{fontFamily:'var(--font-display)', fontWeight: 700, fontSize: 14, letterSpacing: '-0.018em', color: 'var(--fg-1)', lineHeight: 1.05}}>{name}</div>
          <div style={{fontSize: 11, color: 'var(--fg-3)', marginTop: 3}}>{author} · {when}</div>
        </div>
        <span style={{fontSize: 10, color: 'var(--fg-4)', fontFamily: 'var(--font-mono)', whiteSpace:'nowrap'}}>{type}</span>
      </div>
      <div style={{display:'flex', gap: 3}}>
        {palette.map((c, i) => (
          <div key={i} style={{flex: 1, height: 8, borderRadius: 99, background: c}}/>
        ))}
      </div>
    </div>
  </div>
);

const DirA_Brands = () => (
  <AShell breadcrumb={['Brands']}>
    <div style={{padding: '56px 64px 48px', maxWidth: 1280, display:'flex', flexDirection:'column', gap: 44}}>
      <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:32}}>
        <div>
          <div className="eyebrow" style={{color:'var(--fg-3)', marginBottom:14}}>Library · 0 brands</div>
          <h1 style={{
            fontFamily:'var(--font-display)', fontWeight:800,
            fontSize: 64, letterSpacing:'-0.04em', lineHeight: 0.98,
            margin: 0, color:'#000', textWrap:'balance',
            maxWidth: 700,
          }}>Your brands<br/>live here.</h1>
          <p style={{fontSize:17, color:'var(--fg-2)', maxWidth:520, marginTop: 18, lineHeight:1.5}}>
            Every kit you spin up with Fluid — logos, palettes, type, guidelines — stays in this library. Edit, fork, or export them whenever.
          </p>
        </div>
        <button style={{
          display:'inline-flex',alignItems:'center',gap:8,
          padding:'12px 18px',borderRadius:12,
          background:'#000',color:'#fff',fontWeight:600,fontSize:14,
          boxShadow:'0 1px 0 rgba(255,255,255,.1) inset, 0 8px 20px rgba(0,0,0,.18)'
        }}>
          <PlusIcon size={14}/> New brand
        </button>
      </div>

      {/* Hero create card — one coral moment, no background clip-art */}
      <div style={{
        position:'relative',
        background: 'var(--bg-elev)',
        borderRadius: 28,
        padding: '36px 40px',
        boxShadow: 'var(--shadow-sm)',
        display:'flex',alignItems:'center',gap:48,
        overflow:'hidden',
      }}>
        <div style={{flex:1, position:'relative', zIndex:1}}>
          <Chip tone="ai" style={{marginBottom:14}}><Sparkle size={11}/> AI BRAND AGENT</Chip>
          <h2 style={{fontFamily:'var(--font-display)', fontWeight:800, fontSize:34, letterSpacing:'-0.03em', lineHeight:1.05, margin:'0 0 10px', color:'#000', maxWidth: 440}}>
            From idea to identity — instantly.
          </h2>
          <p style={{fontSize:15, color:'var(--fg-2)', margin:'0 0 22px', maxWidth: 480, lineHeight:1.5}}>
            Tell Fluid about your idea. We'll draft a strategy, name, logo, palette, and type — in about 60&nbsp;seconds.
          </p>
          <div style={{display:'flex',gap:10,alignItems:'center'}}>
            <button style={{padding:'12px 20px',borderRadius:12,background:'#000',color:'#fff',fontSize:14,fontWeight:600, display:'inline-flex',alignItems:'center',gap:8}}>
              Start a new brand <ArrowRight size={14}/>
            </button>
            <button style={{padding:'12px 18px',borderRadius:12,background:'transparent',color:'var(--fg-1)',fontSize:14,fontWeight:600,boxShadow:'inset 0 0 0 1px var(--line-strong)'}}>
              Browse templates
            </button>
          </div>
        </div>
        {/* Dynamic vertical-scrolling collage of brand work — same as Home,
            but living in a white card rather than the black hero. */}
        <BrandCollage />
      </div>

      <div>
        <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:18}}>
          <div className="eyebrow" style={{color:'var(--fg-3)'}}>Or, focus on one thing</div>
          <div style={{fontSize:12,color:'var(--fg-4)'}}>4 quick paths</div>
        </div>
        <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14}}>
          <QuickPath
            title="Rebranding"
            sub="Refresh an existing brand. Keep what works, update the rest."
            preview={__assets['assets/min/preview-rebranding.jpg']} previewBg="#EC4C34"
            icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>}
          />
          <QuickPath
            title="Logo"
            sub="Skip the strategy. Drop a name, get marks in seconds."
            preview={__assets['assets/min/preview-logo.jpg']} previewBg="#1E6BF5"
            icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3" /></svg>}
          />
          <QuickPath
            title="Name"
            sub="Nine names with reasoning and domain status."
            preview={__assets['assets/min/preview-name.jpg']} previewBg="#F3F3F4"
            icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 7 4 4 20 4 20 7" /><line x1="9" y1="20" x2="15" y2="20" /><line x1="12" y1="4" x2="12" y2="20" /></svg>}
          />
          <QuickPath
            title="Guidelines"
            sub="Already have a logo and palette? We'll write the rules."
            preview={__assets['assets/min/preview-guidelines.jpg']} previewBg="#F4F6F5"
            icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /><line x1="9" y1="7" x2="16" y2="7" /></svg>}
          />
        </div>
      </div>

      {/* Featured templates — polished kits to start from */}
      <div>
        <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',marginBottom:18, gap:24}}>
          <div>
            <div className="eyebrow" style={{color:'var(--fg-3)', marginBottom:6}}>Brands to start from · 28</div>
            <h2 style={{
              fontFamily:'var(--font-display)', fontWeight: 800, fontSize: 30,
              letterSpacing:'-0.03em', lineHeight: 1, margin: 0, color: '#000',
            }}>Start from a brand you admire.</h2>
            <p style={{margin:'8px 0 0', fontSize: 13.5, color:'var(--fg-2)', maxWidth: 520, lineHeight: 1.5}}>
              Begin with the DNA of a brand you love — Fluid adapts the whole identity to your brief, then makes it yours.
            </p>
          </div>
          <div style={{display:'flex', alignItems:'center', gap:8}}>
            <button style={{padding:'8px 12px', borderRadius:10, background:'var(--bg-elev)', color:'var(--fg-2)', fontSize:12, fontWeight:600, boxShadow:'inset 0 0 0 1px var(--line)'}}>All categories</button>
            <button style={{padding:'8px 12px', borderRadius:10, background:'transparent', color:'var(--fg-2)', fontSize:12, fontWeight:600, display:'inline-flex', alignItems:'center', gap:6}}>
              Browse all 28 <ArrowRight size={11}/>
            </button>
          </div>
        </div>
        <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap: 14}}>
          {/* Apple — minimal, refined, premium */}
          <AInspirationCard
            name="Apple" category="Consumer tech · Premium"
            hero={<AppleHero/>}
            style={{
              label:'Minimal · Refined',
              pill:{
                bg:'#FFFFFF', color:'#1D1D1F',
                font: APPLE_DISPLAY, weight: 500, tracking:'-0.005em',
                shadow:'inset 0 0 0 1px #D2D2D7',
                dot:'#1D1D1F',
              },
            }}
          />
          {/* Figma — playful, vibrant, collaborative */}
          <AInspirationCard
            name="Figma" category="Design tool · Collaborative"
            hero={<FigmaHero/>}
            style={{
              label:'Playful · Vibrant',
              pill:{
                bg:'#0E0E0E', color:'#FFFFFF',
                font: FIGMA_TYPE, weight: 700, tracking:'-0.005em',
                dot:'#A259FF', dotSize: 6,
              },
            }}
          />
          {/* Perplexity — editorial, considered, paper warmth */}
          <AInspirationCard
            name="Perplexity" category="AI search · Editorial"
            hero={<PerplexityHero/>}
            style={{
              label:'Editorial · Considered',
              pill:{
                bg:'#FBF7EE', color:'#1F4E47',
                font: PERPLEXITY_DISPLAY, weight: 500, italic: true,
                tracking:'-0.005em', size: 11.5,
                shadow:'inset 0 0 0 1px #E8DFC8',
                dot:'#1F4E47',
              },
            }}
          />
          {/* Tesla — red-dominant, bold, technical */}
          <AInspirationCard
            name="Tesla" category="Automotive · Technology"
            hero={<TeslaHero/>}
            style={{
              label:'Bold · Technical',
              pill:{
                bg:'#E31937', color:'#FFFFFF',
                font: TESLA_TYPE, weight: 700,
                tracking:'0.18em', transform:'uppercase', size: 9.5,
                padding:'5px 11px',
                dot:'#000000', dotSize: 5,
              },
            }}
          />
        </div>
      </div>

      {/* From the community — social proof + inspiration */}
      <div>
        <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',marginBottom:18, gap:24}}>
          <div>
            <div className="eyebrow" style={{color:'var(--fg-3)', marginBottom:6}}>From the community · 12 published this week</div>
            <h2 style={{
              fontFamily:'var(--font-display)', fontWeight: 800, fontSize: 30,
              letterSpacing:'-0.03em', lineHeight: 1, margin: 0, color: '#000',
            }}>Made with Fluid.</h2>
          </div>
          <button style={{padding:'8px 12px', borderRadius:10, background:'transparent', color:'var(--fg-2)', fontSize:12, fontWeight:600, display:'inline-flex', alignItems:'center', gap:6}}>
            Open showcase <ArrowRight size={11}/>
          </button>
        </div>
        <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap: 14}}>
          <CommunityCard
            name="Cadence" author="Mikael R." when="2d ago" type="SaaS"
            mood={{bg:'#F4EFE7', fg:'#1F232A'}}
            mark={{text:'Cadence', weight: 800, size: 26, tracking:'-0.04em', dot:true, dotColor:'#FD7947'}}
            palette={['#1F232A','#FD7947','#FDBA50','#44D9C7','#F4EFE7']}
          />
          <CommunityCard
            name="Vesper" author="Lina K." when="5d ago" type="App"
            mood={{bg:'#0F1115', fg:'#FDBBC0'}}
            mark={{text:'V.', weight: 900, size: 56, tracking:'-0.06em'}}
            palette={['#0F1115','#FDBBC0','#FD7947','#F4EFE7']}
          />
          <CommunityCard
            name="Quiet Hours" author="Theo M." when="1w ago" type="Studio"
            mood={{bg:'#E8E4D8', fg:'#1A1A1A'}}
            mark={{text:'QH', weight: 600, size: 38, tracking:'-0.03em'}}
            palette={['#1A1A1A','#7A6F58','#B0A48A','#E8E4D8']}
          />
          <CommunityCard
            name="Northwind" author="Sasha P." when="1w ago" type="B2B"
            mood={{bg:'#22272F', fg:'#3B82F6'}}
            mark={{text:'northwind', weight: 700, size: 22, tracking:'-0.025em'}}
            palette={['#0F1115','#22272F','#3B82F6','#A4ADBA']}
          />
        </div>
      </div>

      {/* Footer strip — quick help / docs / demo */}
      <div style={{
        marginTop: 24, paddingTop: 28, paddingBottom: 28,
        borderTop: '1px solid var(--line)',
        display:'flex', alignItems:'center', gap: 28,
      }}>
        <FluidWordmark height={34}/>
        <div style={{width:1, height:26, background:'var(--line)'}}/>
        <div style={{display:'flex', alignItems:'center', gap: 22, fontSize: 12.5, color:'var(--fg-2)'}}>
          <a style={{color:'inherit', display:'inline-flex', alignItems:'center', gap:6}}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            Watch the 60s demo
          </a>
          <a style={{color:'inherit'}}>How Fluid works</a>
          <a style={{color:'inherit'}}>Read the manifesto</a>
          <a style={{color:'inherit'}}>Brand kit changelog</a>
          <a style={{color:'inherit'}}>Help &amp; docs</a>
        </div>
        <div style={{flex:1}}/>
        <span style={{fontSize: 11, color:'var(--fg-4)', fontFamily:'var(--font-mono)'}}>v1.4 · all systems normal</span>
      </div>
    </div>
  </AShell>
);

// Card shell — every studio card uses this. The "step number" lives in
// the corner; the body slot is whatever the card carries.
const ACard = ({ n, title, sub, state, children, style, span }) => {
  const states = {
    empty:   { dot: 'var(--fg-4)',         label: 'Empty' },
    waiting: { dot: 'var(--line-strong)',  label: 'Waiting on basics' },
    draft:   { dot: '#FDBA50',             label: 'Draft' },
    live:    { dot: '#44D9C7',             label: 'Streaming' },
    done:    { dot: '#000',                label: 'Locked' },
  };
  const s = states[state] || states.empty;
  return (
    <div style={{
      gridColumn: span ? `span ${span}` : 'auto',
      background: 'var(--bg-elev)', borderRadius: 20,
      boxShadow: state === 'live' ? '0 0 0 1.5px #44D9C7, var(--shadow-sm)' : 'var(--shadow-sm)',
      padding: 20,
      display:'flex',flexDirection:'column',gap:16,
      position: 'relative',
      ...style,
    }}>
      <div style={{display:'flex',alignItems:'flex-start',gap:14}}>
        <div style={{
          width:30, height:30, borderRadius: 8,
          background: 'var(--bg)', color: 'var(--fg-1)',
          display:'inline-flex',alignItems:'center',justifyContent:'center',
          fontFamily:'var(--font-mono)', fontSize: 11, fontWeight:600,
          boxShadow:'inset 0 0 0 1px var(--line)',
          flex:'0 0 30px',
        }}>0{n}</div>
        <div style={{flex:1, minWidth:0}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <h3 style={{fontFamily:'var(--font-display)', fontWeight:700, fontSize:16, letterSpacing:'-0.015em', margin: 0, color:'#000'}}>{title}</h3>
            <div style={{flex:1}}/>
            <span style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:11,fontWeight:500,color:'var(--fg-3)'}}>
              <span style={{width:6,height:6,borderRadius:99,background:s.dot, boxShadow: state==='live' ? '0 0 6px '+s.dot : 'none'}}/> {s.label}
            </span>
          </div>
          <div style={{fontSize: 12.5, color:'var(--fg-3)', marginTop: 2}}>{sub}</div>
        </div>
      </div>
      <div style={{flex:1}}>{children}</div>
    </div>
  );
};

// Progress tracker for the wizard flow
const AStepProgress = ({ step }) => {
  const { navigate } = useRouter();
  const steps = [
    { n: 1, label: 'Brief' },
    { n: 2, label: 'Style' },
    { n: 3, label: 'Name' },
    { n: 4, label: 'Logo' },
    { n: 5, label: 'Kit' },
  ];
  return (
    <div style={{display:'flex',alignItems:'center',gap:10}}>
      {steps.map((s, i) => {
        // Completed (earlier) steps are clickable to jump back; the current and
        // future steps are not.
        const done = s.n < step;
        return (
        <React.Fragment key={s.n}>
          {i > 0 && <div style={{width:16,height:1.5,background:s.n <= step ? '#000' : 'var(--line)'}}/>}
          <div
            onClick={done ? () => navigate('step' + s.n) : undefined}
            title={done ? 'Back to ' + s.label : undefined}
            style={{display:'flex',alignItems:'center',gap:6, cursor: done ? 'pointer' : 'default'}}
          >
            <div style={{
              width:22,height:22,borderRadius:'50%',
              background: s.n === step ? '#000' : (s.n < step ? 'var(--line-strong)' : 'transparent'),
              color: s.n === step ? '#fff' : (s.n < step ? 'var(--fg-1)' : 'var(--fg-3)'),
              border: s.n >= step ? '1px solid var(--line-strong)' : 'none',
              display:'flex',alignItems:'center',justifyContent:'center',
              fontSize:10,fontWeight:700,fontFamily:'var(--font-mono)'
            }}>{s.n < step ? (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            ) : s.n}</div>
            <span style={{fontSize:12,fontWeight:s.n === step ? 700 : 500,color:s.n === step ? '#000' : 'var(--fg-3)'}}>{s.label}</span>
          </div>
        </React.Fragment>
        );
      })}
    </div>
  );
};

// Wizard layout wrapper
const AWizardLayout = ({ step, title, subtitle, status, progress, children, onNext, nextLabel, backLabel, isThinking }) => {
  const { navigate } = useRouter();
  // Back steps to the previous wizard step (available from step 2 on).
  const canBack = step > 1;
  const goBack = () => navigate('step' + (step - 1));
  return (
  <AShell breadcrumb={['Brands', 'New brand']}>
    <div style={{display:'flex', flexDirection:'column', height:'100%', overflow:'hidden'}}>
      {/* Wizard Header */}
      <div style={{
        padding: '24px 36px 6px',
        display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:24,
      }}>
        <div style={{minWidth:0}}>
          <div style={{display:'flex',alignItems:'center',gap:10, marginBottom:8}}>
            <Chip tone={status === 'live' ? 'live' : 'neutral'}>{status === 'live' ? 'Generating' : status}</Chip>
            <span style={{fontSize:11.5,color:'var(--fg-3)',fontFamily:'var(--font-mono)'}}>{progress}</span>
          </div>
          <h2 style={{
            fontFamily:'var(--font-display)', fontWeight:800,
            fontSize: 42, letterSpacing:'-0.035em', lineHeight:1, margin: 0,
            color: '#000',
          }}>{title}</h2>
          {subtitle && <div style={{fontSize: 14, color:'var(--fg-3)', marginTop: 8}}>{subtitle}</div>}
        </div>
        <AStepProgress step={step} />
      </div>

      {/* Wizard Content */}
      <div style={{flex:1, minHeight:0, overflowY:'auto', padding:'24px 36px 110px'}}>
        {children}
      </div>

      {/* Wizard Navigation Bar / Dock */}
      <div style={{
        position:'absolute', bottom: 20, left: 24, right: 24,
        background: '#0E0F12', color: '#fff', borderRadius: 16,
        padding: '14px 18px',
        display:'flex',alignItems:'center',gap:14,
        boxShadow:'0 18px 50px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.06)',
        overflow:'hidden',
        zIndex: 10
      }}>
        <div style={{
          position:'absolute',top:0,left:0,right:0,height:2,
          background:'var(--fl-accent)',
        }}/>
        {/* Back button first (leftmost), then the Fluid logo, then the status
            text — the logo sits immediately to the left of the text. */}
        {canBack ? (
          <button onClick={goBack} style={{
            padding:'8px 14px',borderRadius:8,background:'rgba(255,255,255,.10)',color:'#fff',
            fontSize:12,fontWeight:600, border:0, cursor:'pointer', flex:'0 0 auto'
          }}>
            {backLabel || 'Back'}
          </button>
        ) : <div/>}
        <div style={{
          width: 28, height: 28,
          background:'url("' + __assets['assets/min/fluid-app-icon.png'] + '") center / contain no-repeat',
          flex:'0 0 28px',
        }}/>
        <div style={{flex:1, minWidth:0, fontSize: 13, color:'rgba(255,255,255,.85)'}}>
          {isThinking ? (
            <span style={{display:'inline-flex',alignItems:'center',gap:8}}>
              Fluid AI is drafting options... <Thinking/>
            </span>
          ) : "Fill in card details to refine the strategy."}
        </div>
        <button onClick={onNext} style={{
          padding:'8px 14px',borderRadius:8,background:'#fff',color:'#000',
          fontSize:12,fontWeight:600,display:'inline-flex',alignItems:'center',gap:6,
          border:0, cursor:'pointer'
        }}>
          {nextLabel || 'Continue'} <ArrowRight size={12}/>
        </button>
      </div>
    </div>
  </AShell>
  );
};

// Summary side panel used in steps 2, 3, 4
const AContextPanel = ({ brief, styleName, brandName }) => (
  <div style={{
    background: 'var(--bg-elev)', borderRadius: 16, padding: 18,
    boxShadow: 'var(--shadow-xs), inset 0 0 0 1px var(--line)',
    display: 'flex', flexDirection: 'column', gap: 14,
    height: 'max-content'
  }}>
    <div className="eyebrow" style={{fontSize: 10, color: 'var(--fg-3)'}}>Brand Context</div>
    
    {brief && (
      <div>
        <div style={{fontSize:11.5, fontWeight:600, color:'var(--fg-3)', marginBottom:4}}>01 Brief</div>
        <div style={{fontSize:12.5, color:'var(--fg-2)', lineHeight:1.4}}>{brief}</div>
      </div>
    )}

    {styleName && (
      <div>
        <div style={{fontSize:11.5, fontWeight:600, color:'var(--fg-3)', marginBottom:4}}>02 Style</div>
        <div style={{display:'flex', gap:6, flexWrap:'wrap'}}>
          <Chip tone="live">{styleName}</Chip>
        </div>
      </div>
    )}

    {brandName && (
      <div>
        <div style={{fontSize:11.5, fontWeight:600, color:'var(--fg-3)', marginBottom:4}}>03 Name</div>
        <div style={{fontFamily:'var(--font-display)', fontWeight:700, fontSize:15, color:'var(--fg-1)'}}>{brandName}</div>
      </div>
    )}
  </div>
);

// =====================================================================
// A2 · Step 1 · Brief Input Screen
// Three structured fields: Brand description (required, the hero field
// with AI assist), Audience (optional) and Competitors (optional, chip
// input).
// =====================================================================

// Reusable card shell for each field on the brief screen. Step number
// badge + title on the left, optional badge / counter on the right.
const AFieldCard = ({ n, title, optional, meta, children }) => (
  <div style={{
    background: 'var(--bg-elev)', borderRadius: 20,
    boxShadow: 'var(--shadow-sm), inset 0 0 0 1px var(--line)',
    padding: 24, display:'flex', flexDirection:'column', gap:14,
  }}>
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10}}>
      <div style={{display:'flex',alignItems:'center',gap:10, minWidth:0}}>
        <div style={{
          width:30, height:30, borderRadius: 8,
          background: 'var(--bg)', color: 'var(--fg-1)',
          display:'inline-flex',alignItems:'center',justifyContent:'center',
          fontFamily:'var(--font-mono)', fontSize: 11, fontWeight:600,
          boxShadow:'inset 0 0 0 1px var(--line)',
          flex:'0 0 30px',
        }}>{n}</div>
        <h3 style={{fontFamily:'var(--font-display)', fontWeight:700, fontSize:16, margin: 0, color:'#000'}}>{title}</h3>
        {optional && (
          <span style={{
            fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
            color: 'var(--fg-3)', background: 'var(--bg-sunken)',
            padding: '3px 7px', borderRadius: 99, textTransform: 'uppercase',
          }}>Optional</span>
        )}
      </div>
      {meta && <span style={{fontSize:11, color:'var(--fg-3)', fontFamily:'var(--font-mono)', whiteSpace:'nowrap'}}>{meta}</span>}
    </div>
    {children}
  </div>
);

// Pill-style competitor chip with a remove ×
const ACompetitorChip = ({ name, domain, onRemove }) => (
  <div style={{
    display:'inline-flex', alignItems:'center', gap:8,
    background:'var(--bg)', borderRadius: 99,
    padding:'5px 5px 5px 12px',
    boxShadow:'inset 0 0 0 1px var(--line)',
  }}>
    <div style={{
      width:18, height:18, borderRadius: 99,
      background:'var(--bg-sunken)', color:'var(--fg-2)',
      display:'inline-flex', alignItems:'center', justifyContent:'center',
      fontFamily:'var(--font-display)', fontSize: 10, fontWeight:800,
    }}>{(name[0] || '?').toUpperCase()}</div>
    <div style={{display:'flex', flexDirection:'column', lineHeight:1}}>
      <span style={{fontSize:12, fontWeight:600, color:'var(--fg-1)'}}>{name}</span>
      {domain ? <span style={{fontSize:9.5, color:'var(--fg-4)', fontFamily:'var(--font-mono)', marginTop:2}}>{domain}</span> : null}
    </div>
    <button onClick={onRemove} aria-label={'Remove ' + name} style={{
      width:20, height:20, borderRadius:99, marginLeft: 2,
      background:'transparent', border:0, cursor:'pointer',
      color:'var(--fg-3)', display:'inline-flex', alignItems:'center', justifyContent:'center',
    }}>
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
  </div>
);

const DirA_Step1_Brief = () => {
  const { draft, setField } = useBrandDraft();
  const brief = (draft && draft.brief) || '';
  const audience = (draft && draft.audience) || '';
  // Competitors are stored as a comma-separated string; edit them as chips.
  const competitors = ((draft && draft.competitors) || '')
    .split(',').map((s) => s.trim()).filter(Boolean);
  const [compInput, setCompInput] = React.useState('');
  const addCompetitor = (raw) => {
    const v = String(raw || '').trim().replace(/,+$/, '').trim();
    if (!v) return;
    if (competitors.some((c) => c.toLowerCase() === v.toLowerCase())) { setCompInput(''); return; }
    setField('competitors', [...competitors, v].join(', '));
    setCompInput('');
  };
  const removeCompetitor = (name) => {
    setField('competitors', competitors.filter((c) => c !== name).join(', '));
  };

  // Inline AI assists. `assisting` holds the task id currently running.
  const brandId = draft && draft.id;
  const hasBrief = !!String(brief).trim();
  const [assisting, setAssisting] = React.useState('');
  const [assistErr, setAssistErr] = React.useState('');
  const runAssist = async (task) => {
    if (!brandId || assisting) return;
    if (!hasBrief) { setAssistErr('Add a brand description first.'); return; }
    setAssisting(task); setAssistErr('');
    const { result, error } = await apiAssist(brandId, task);
    if (error) setAssistErr(error);
    else if (result) {
      if (task === 'audience' && result.text) setField('audience', result.text);
      else if (task === 'competitors' && result.items) {
        const merged = [...competitors];
        result.items.forEach((it) => { if (it && !merged.some((c) => c.toLowerCase() === it.toLowerCase())) merged.push(it); });
        setField('competitors', merged.join(', '));
      } else if (result.text) setField('brief', result.text);
    }
    setAssisting('');
  };
  const pill = { padding:'5px 10px', borderRadius:8, background:'var(--bg-sunken)', color:'var(--fg-2)', fontSize:11, fontWeight:600, display:'inline-flex', alignItems:'center', gap:6, border:0, cursor:'pointer' };
  const busy = (t) => assisting === t;

  return (
  <AWizardLayout
    step={1}
    title="Tell us about your idea."
    subtitle="A short description is enough to get started — Fluid handles the rest."
    status="Draft"
    progress="Step 1 of 5"
    nextLabel="Continue to Style"
    onNext={() => {}}
    isThinking={false}
  >
    <div style={{display:'flex', flexDirection:'column', gap:14}}>
      {/* 01 · Brand description — the hero field */}
      <AFieldCard n="01" title="Brand description" meta="184 / 800">
        <div style={{
          position:'relative',
          background: 'var(--bg)', borderRadius: 14,
          boxShadow:'inset 0 0 0 1px var(--line)',
          padding: '18px 18px 14px',
        }}>
          <textarea
            value={brief}
            onChange={(e) => setField('brief', e.target.value)}
            placeholder="A productivity tool for founders who run on rituals — not roadmaps. Daily focus prompts, weekly retros, monthly themes — all in one quiet surface."
            rows={3}
            style={{
              width:'100%', resize:'vertical', border:'none', outline:'none', background:'transparent',
              fontFamily:'var(--font-display)', fontSize: 22, fontWeight: 500,
              letterSpacing:'-0.018em', color:'#000', lineHeight: 1.4,
              minHeight: 84,
            }}
          />
          <div style={{display:'flex', alignItems:'center', gap:8, marginTop:14, paddingTop:14, borderTop:'1px dashed var(--line)'}}>
            <button onClick={() => runAssist('brief_shorter')} disabled={!!assisting} style={{...pill, opacity: assisting && !busy('brief_shorter') ? 0.5 : 1}}>
              <Sparkle size={11}/> {busy('brief_shorter') ? 'Rewriting…' : 'Rewrite shorter'}
            </button>
            <button onClick={() => runAssist('brief_punchier')} disabled={!!assisting} style={{...pill, opacity: assisting && !busy('brief_punchier') ? 0.5 : 1}}>{busy('brief_punchier') ? 'Working…' : 'Make it punchier'}</button>
            <button onClick={() => runAssist('brief_sharper')} disabled={!!assisting} style={{...pill, opacity: assisting && !busy('brief_sharper') ? 0.5 : 1}}>{busy('brief_sharper') ? 'Working…' : 'Sharpen the angle'}</button>
            <div style={{flex:1}}/>
            <span style={{fontSize:10.5,color:'var(--fg-4)',fontFamily:'var(--font-mono)'}}>⌘↵ to continue</span>
          </div>
          {assistErr && <div style={{marginTop:10, fontSize:11.5, color:'#A8421F'}}>{assistErr}</div>}
        </div>
      </AFieldCard>

      {/* 02 · Audience and 03 · Competitors — both optional */}
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:14}}>
        <AFieldCard n="02" title="Audience" optional>
          <div style={{
            background:'var(--bg)', borderRadius: 14,
            boxShadow:'inset 0 0 0 1px var(--line)',
            padding:'14px 16px',
            display:'flex', flexDirection:'column', gap:10,
            minHeight: 124,
          }}>
            <textarea
              value={audience}
              onChange={(e) => setField('audience', e.target.value)}
              placeholder="Solo founders & indie makers, 25–40, already living in Notion, Linear, or Sunsama."
              rows={3}
              style={{
                width:'100%', resize:'vertical', border:'none', outline:'none', background:'transparent',
                fontFamily:'var(--font-display)', fontSize:16, fontWeight:500,
                letterSpacing:'-0.012em', color:'var(--fg-1)', lineHeight:1.45,
              }}
            />
            <div style={{flex:1}}/>
          </div>
          <div style={{display:'flex', alignItems:'center', gap:8}}>
            <button onClick={() => runAssist('audience')} disabled={!!assisting} style={{...pill, opacity: assisting && !busy('audience') ? 0.5 : 1}}>
              <Sparkle size={11}/> {busy('audience') ? 'Suggesting…' : 'Suggest from description'}
            </button>
            <div style={{flex:1}}/>
            <span style={{fontSize:10.5,color:'var(--fg-4)'}}>Helps tone &amp; visual register</span>
          </div>
        </AFieldCard>

        <AFieldCard n="03" title="Competitors" optional>
          <div style={{
            background:'var(--bg)', borderRadius: 14,
            boxShadow:'inset 0 0 0 1px var(--line)',
            padding:'14px 14px',
            display:'flex', flexDirection:'column', gap:12,
            minHeight: 124,
          }}>
            <div style={{display:'flex', flexWrap:'wrap', gap:6}}>
              {competitors.map((c) => (
                <ACompetitorChip key={c} name={c} onRemove={() => removeCompetitor(c)} />
              ))}
            </div>
            <div style={{flex:1}}/>
            <div style={{
              display:'flex', alignItems:'center', gap:8,
              padding:'8px 10px', borderRadius: 10,
              boxShadow:'inset 0 0 0 1px var(--line)',
              background: 'var(--bg-elev)',
            }}>
              <SearchIcon size={12}/>
              <input
                value={compInput}
                onChange={(e) => setCompInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCompetitor(e.currentTarget.value); } }}
                placeholder="Add a competitor by name or URL…"
                style={{flex:1, border:0, background:'transparent', outline:'none', fontSize:12.5, color:'var(--fg-2)', fontFamily:'inherit'}}
              />
              <span style={{fontSize:10,color:'var(--fg-4)',fontFamily:'var(--font-mono)'}}>↵</span>
            </div>
          </div>
          <div style={{display:'flex', alignItems:'center', gap:8}}>
            <button onClick={() => runAssist('competitors')} disabled={!!assisting} style={{...pill, opacity: assisting && !busy('competitors') ? 0.5 : 1}}>
              <Sparkle size={11}/> {busy('competitors') ? 'Suggesting…' : 'Suggest 3 more'}
            </button>
            <div style={{flex:1}}/>
            <span style={{fontSize:10.5,color:'var(--fg-4)'}}>Helps positioning &amp; differentiation</span>
          </div>
        </AFieldCard>
      </div>
    </div>
  </AWizardLayout>
  );
};

// =====================================================================
// A3 · Step 2 · Style Selection Screen
// Two paths to choose a visual direction:
//   1. Start from an existing brand — inspiration cards showing the
//      whole identity (hero, palette, type, descriptor). 4 by default,
//      expandable.
//   2. Build it piece by piece — three sub-sections (Visual style,
//      Color palette, Typography), each with a "Let AI choose"
//      affordance. The visual-style sub-section also exposes refinement
//      sliders within the chosen register.
// =====================================================================

// Sparkle button — section-level "Let AI choose" affordance
const ALetAI = ({ onClick, busy }) => (
  <button onClick={onClick} disabled={busy} style={{
    display:'inline-flex', alignItems:'center', gap:6,
    padding:'6px 12px', borderRadius: 99,
    background:'#0E0F12', color:'#fff',
    fontSize: 11.5, fontWeight: 600, border:0, cursor: busy ? 'default' : 'pointer',
    boxShadow:'0 1px 4px rgba(0,0,0,.18)', opacity: busy ? 0.7 : 1,
  }}>
    <Sparkle size={11} color="#FDBA50"/> {busy ? 'Choosing…' : 'Let AI choose'}
  </button>
);

// Section heading: number badge + title + meta + AI button
const ASectionHead = ({ n, title, sub, count, ai, onAI, aiBusy }) => (
  <div style={{display:'flex', alignItems:'flex-end', justifyContent:'space-between', gap:24, marginBottom:14}}>
    <div style={{display:'flex', alignItems:'center', gap:12, minWidth:0}}>
      {n && (
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: 'var(--bg-elev)', color: 'var(--fg-1)',
          boxShadow:'inset 0 0 0 1px var(--line)',
          fontFamily:'var(--font-mono)', fontSize: 11, fontWeight: 600,
          display:'inline-flex', alignItems:'center', justifyContent:'center',
          flex:'0 0 28px',
        }}>{n}</div>
      )}
      <div style={{minWidth:0}}>
        <div style={{fontFamily:'var(--font-display)', fontWeight:700, fontSize:18, letterSpacing:'-0.02em', color:'#000', lineHeight: 1.05}}>{title}</div>
        {sub && <div style={{fontSize:12, color:'var(--fg-3)', marginTop:3, lineHeight:1.3}}>{sub}</div>}
      </div>
    </div>
    <div style={{display:'flex', alignItems:'center', gap:10}}>
      {count && <span style={{fontSize:11, color:'var(--fg-3)', fontFamily:'var(--font-mono)'}}>{count}</span>}
      {ai && <ALetAI onClick={onAI} busy={aiBusy}/>}
    </div>
  </div>
);

// =====================================================================
// Brand hero components — each one is a faithful rendering of the
// brand's visual register: real logomark, signature typography stack,
// and a recognizable UI/marketing element from that brand's surface.
// =====================================================================

// Apple's SF-style font stack actually renders as San Francisco on macOS.
const APPLE_DISPLAY = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif";
const APPLE_BODY    = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif";
// Helvetica Neue stands in for Tesla's Gotham on macOS — same modernist character.
const TESLA_TYPE    = "'Helvetica Neue', 'Arial Narrow', Helvetica, Arial, sans-serif";
// Inter is the closest widely-available font to Whyte (Figma's display).
const FIGMA_TYPE    = "'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";
// New York is the closest macOS serif to FK Display Pro's editorial register.
const PERPLEXITY_DISPLAY = "'New York', 'Times New Roman', 'Tiempos Headline', Georgia, serif";
const PERPLEXITY_BODY    = "-apple-system, BlinkMacSystemFont, 'Söhne', 'Inter', sans-serif";

// Apple logomark — the canonical bitten-apple silhouette, in its
// official proportions, drawn from Apple's standard logo path.
const AppleLogo = ({ size = 38, fill = '#1D1D1F' }) => (
  <svg width={size} height={size * (1.225)} viewBox="0 0 814 1000" fill={fill} aria-label="Apple">
    <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105.6-57-155.5-127C46.7 790.7 0 663 0 541.8c0-194.4 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"/>
  </svg>
);

// Figma logomark — the canonical 5-shape construction.
const FigmaLogo = ({ size = 26 }) => (
  <svg width={size * (38/57)} height={size} viewBox="0 0 38 57" aria-label="Figma">
    <path fill="#1ABCFE" d="M19 28.5a9.5 9.5 0 1 1 19 0 9.5 9.5 0 0 1-19 0z"/>
    <path fill="#0ACF83" d="M0 47.5A9.5 9.5 0 0 1 9.5 38H19v9.5a9.5 9.5 0 1 1-19 0z"/>
    <path fill="#FF7262" d="M19 0v19h9.5a9.5 9.5 0 1 0 0-19H19z"/>
    <path fill="#F24E1E" d="M0 9.5A9.5 9.5 0 0 0 9.5 19H19V0H9.5A9.5 9.5 0 0 0 0 9.5z"/>
    <path fill="#A259FF" d="M0 28.5A9.5 9.5 0 0 0 9.5 38H19V19H9.5A9.5 9.5 0 0 0 0 28.5z"/>
  </svg>
);

// Collaborative cursor pill — a Figma multiplayer trope.
const FigmaCursor = ({ color, name, top, left, right, bottom }) => (
  <div style={{position:'absolute', top, left, right, bottom, display:'flex', alignItems:'flex-start', gap: 3, pointerEvents:'none'}}>
    <svg width="12" height="14" viewBox="0 0 16 18" style={{filter:'drop-shadow(0 1px 1px rgba(0,0,0,.15))'}}>
      <path fill={color} stroke="#fff" strokeWidth="0.8" strokeLinejoin="round" d="M2 1.5L13.5 7.5L8.5 9.5L6 15L2 1.5Z"/>
    </svg>
    <span style={{
      background: color, color:'#fff',
      fontSize: 8.5, fontWeight: 600, letterSpacing: '-0.01em',
      padding:'2px 6px', borderRadius: 4,
      fontFamily: FIGMA_TYPE, whiteSpace:'nowrap',
      lineHeight: 1.2, transform:'translateY(2px)',
    }}>{name}</span>
  </div>
);

// Perplexity logomark — the canonical asterisk-burst, eight rays
// radiating from a center, with rounded caps. Drawn to match the
// thicker, more pronounced proportions of Perplexity's actual mark.
const PerplexityLogo = ({ size = 22, color = '#20A39E' }) => {
  // 8 rays at 45° increments, slightly tapered via rounded rect.
  const rays = [0, 45, 90, 135];
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-label="Perplexity">
      <g fill={color}>
        {rays.map((deg) => (
          <rect key={deg}
            x="28.5" y="4" width="7" height="56" rx="3.5"
            transform={`rotate(${deg} 32 32)`}
          />
        ))}
        {/* Center disc to fuse the rays and keep the burst visually solid */}
        <circle cx="32" cy="32" r="6" fill={color}/>
      </g>
    </svg>
  );
};

// Tesla T mark — the canonical stator-cross-section silhouette.
// Top arched bar with central notch + tapered vertical stem.
const TeslaLogo = ({ size = 30, fill = '#E31937' }) => (
  <svg width={size} height={size * (1.16)} viewBox="0 0 342 397" fill={fill} aria-label="Tesla">
    {/* Wide arched top bar with central downward notch */}
    <path d="M171 0C76.6 0 0 21.4 0 67.7c0 0 17.6 19.3 53.6 33.3l21.8-26.4S116.5 60.7 171 60.7c54.5 0 95.7 13.9 95.7 13.9l21.8 26.4c36-14 53.6-33.3 53.6-33.3C342 21.4 265.4 0 171 0z"/>
    {/* Vertical stem with a tapered top */}
    <path d="M171 105.3c-31.6 0-63.4 11.4-63.4 11.4l30.7 38.7v241.6h65.4V155.4l30.7-38.7s-31.8-11.4-63.4-11.4z"/>
  </svg>
);

// ── Brand logo images (user-supplied official marks) ─────────────────
// Square brand tiles (white mark on the brand's own background color).
// Used as the canonical Apple / Perplexity / Tesla logo across screens.
const BRAND_LOGO_SRC = {
  apple: __assets['assets/min/logo-apple.png'],
  perplexity: __assets['assets/min/logo-perplexity.png'],
  tesla: __assets['assets/min/logo-tesla.png'],
};
// `fill` mode: stretch to fill an overflow-hidden parent tile (parent owns
// the radius). Otherwise renders a self-contained rounded square at `size`.
const BrandLogoImg = ({ brand, size = 48, radius, fill = false, style }) => (
  <img src={BRAND_LOGO_SRC[brand]} alt={brand} draggable={false}
    style={fill
      ? { width: '100%', height: '100%', objectFit: 'cover', display: 'block', ...style }
      : { width: size, height: size, borderRadius: radius != null ? radius : Math.round(size * 0.22), objectFit: 'cover', display: 'block', ...style }} />
);

// ── Apple hero — brand identity sheet ─────────────────────────────────
// Centred premium composition. Logo, wordmark, "Hello." type specimen
// in three weights, and the product-finish color discs that read as
// purely Apple. Inspired by the Apple brand book + apple.com configurator.
const AppleHero = () => {
  const finishes = [
    { name:'Black',   color:'#1F1F1F', ring:'#0A0A0A' },
    { name:'Silver',  color:'#E3E4E6', ring:'#C9CACC' },
    { name:'Gold',    color:'#F1E0C5', ring:'#D9C5A4' },
    { name:'Blue',    color:'#A5C4D6', ring:'#7EA0B5' },
    { name:'Natural', color:'#B6AB9C', ring:'#90867A' },
  ];
  return (
    <div style={{
      height: 400,
      background: 'radial-gradient(120% 90% at 50% 30%, #FFFFFF 0%, #F5F5F7 70%, #EAEAED 100%)',
      color:'#1D1D1F', position:'relative', overflow:'hidden',
      display:'flex', flexDirection:'column', alignItems:'center',
      padding:'22px 24px 24px',
    }}>
      {/* Eyebrow */}
      <div style={{
        position:'absolute', top: 14, left: 18,
        fontFamily: APPLE_DISPLAY, fontWeight: 600, fontSize: 8.5,
        letterSpacing: '0.18em', textTransform: 'uppercase', color:'#86868B',
      }}>Designed in California</div>
      <div style={{
        position:'absolute', top: 14, right: 18,
        fontFamily: APPLE_DISPLAY, fontWeight: 500, fontSize: 8.5,
        letterSpacing: '0.04em', color:'#86868B',
      }}>Identity · v17</div>

      {/* Logo + wordmark — centered hero */}
      <div style={{flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap: 16}}>
        <BrandLogoImg brand="apple" size={68} radius={16} style={{ boxShadow: '0 6px 18px rgba(0,0,0,.18)' }}/>
        <div style={{
          fontFamily: APPLE_DISPLAY, fontWeight: 600, fontSize: 38,
          letterSpacing: '-0.045em', lineHeight: 1, color:'#1D1D1F',
        }}>Apple</div>
        <div style={{
          fontFamily: APPLE_DISPLAY, fontWeight: 400, fontStyle:'italic', fontSize: 13,
          letterSpacing: '-0.01em', color:'#6E6E73', marginTop: -6,
        }}>Think different.</div>
      </div>

      {/* Type specimen */}
      <div style={{width:'100%', borderTop:'1px solid #D2D2D7', paddingTop: 14, marginBottom: 12}}>
        <div style={{display:'flex', alignItems:'baseline', justifyContent:'space-between', gap: 6}}>
          {[
            {weight: 300, label:'Light'},
            {weight: 400, label:'Regular'},
            {weight: 600, label:'Semibold'},
            {weight: 700, label:'Bold'},
          ].map((w) => (
            <div key={w.label} style={{textAlign:'center', flex:1}}>
              <div style={{fontFamily: APPLE_DISPLAY, fontWeight: w.weight, fontSize: 22, letterSpacing:'-0.04em', color:'#1D1D1F', lineHeight: 1}}>Hello.</div>
              <div style={{fontFamily: APPLE_DISPLAY, fontWeight: 400, fontSize: 8, letterSpacing:'0.06em', textTransform:'uppercase', color:'#86868B', marginTop: 4}}>{w.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Product color discs */}
      <div style={{width:'100%'}}>
        <div style={{fontFamily: APPLE_DISPLAY, fontWeight: 500, fontSize: 9, letterSpacing:'0.12em', textTransform:'uppercase', color:'#86868B', marginBottom: 8, textAlign:'center'}}>Available in five finishes</div>
        <div style={{display:'flex', justifyContent:'center', gap: 12}}>
          {finishes.map(f => (
            <div key={f.name} style={{display:'flex', flexDirection:'column', alignItems:'center', gap: 5}}>
              <div style={{
                width: 22, height: 22, borderRadius: 99,
                background: f.color, boxShadow:`inset 0 0 0 1px ${f.ring}, 0 1px 2px rgba(0,0,0,.08)`,
              }}/>
              <div style={{fontFamily: APPLE_DISPLAY, fontWeight: 500, fontSize: 8, letterSpacing:'-0.005em', color:'#6E6E73'}}>{f.name}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Figma hero — brand identity sheet ─────────────────────────────────
// The five logomark shapes are exposed as standalone color/shape tokens —
// the building blocks of Figma's identity. Big logomark + wordmark up top,
// then a "five elements" specimen, then a cursor-pill row that nods at
// multiplayer without being an in-app screenshot.
const FigmaHero = () => {
  // The five shape "tokens" mirror the actual Figma logo construction.
  const tokens = [
    { color:'#F24E1E', name:'Red',    shape:'rounded-r' },
    { color:'#FF7262', name:'Coral',  shape:'half-r' },
    { color:'#A259FF', name:'Purple', shape:'rounded-r' },
    { color:'#1ABCFE', name:'Blue',   shape:'circle' },
    { color:'#0ACF83', name:'Green',  shape:'rounded-r' },
  ];
  return (
    <div style={{
      height: 400,
      background:'linear-gradient(180deg, #FFFFFF 0%, #FAFAFA 100%)',
      color:'#0E0E0E', position:'relative', overflow:'hidden',
      display:'flex', flexDirection:'column',
      padding: '22px 22px 24px',
    }}>
      {/* Top: logo + tracking eyebrow */}
      <div style={{display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom: 14}}>
        <FigmaLogo size={42}/>
        <div style={{textAlign:'right'}}>
          <div style={{fontFamily: FIGMA_TYPE, fontWeight: 600, fontSize: 8.5, letterSpacing:'0.18em', textTransform:'uppercase', color:'#7A7A7A'}}>Brand · 2024</div>
          <div style={{fontFamily: FIGMA_TYPE, fontWeight: 500, fontSize: 8.5, letterSpacing:'0.04em', color:'#7A7A7A', marginTop:2}}>Whyte / Inter</div>
        </div>
      </div>

      {/* Wordmark + tagline */}
      <div style={{marginBottom: 14}}>
        <div style={{
          fontFamily: FIGMA_TYPE, fontWeight: 700, fontSize: 38,
          letterSpacing:'-0.04em', lineHeight: 0.95, color:'#0E0E0E',
        }}>Figma</div>
        <div style={{
          fontFamily: FIGMA_TYPE, fontWeight: 500, fontSize: 12,
          letterSpacing:'-0.015em', color:'#0E0E0E', marginTop: 4, opacity: .7,
        }}>Anything you can imagine.</div>
      </div>

      {/* The Five — color/shape tokens */}
      <div style={{borderTop:'1px solid #ECECEC', paddingTop: 12, marginBottom: 12}}>
        <div style={{fontFamily: FIGMA_TYPE, fontWeight: 600, fontSize: 8.5, letterSpacing:'0.16em', textTransform:'uppercase', color:'#0E0E0E', marginBottom: 10}}>The five elements</div>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-end', gap: 6}}>
          {tokens.map(t => (
            <div key={t.name} style={{display:'flex', flexDirection:'column', alignItems:'center', gap: 6, flex:1}}>
              {t.shape === 'circle' && (
                <div style={{width: 36, height: 36, borderRadius: 99, background: t.color}}/>
              )}
              {t.shape === 'rounded-r' && (
                <div style={{width: 36, height: 36, borderRadius: '4px 99px 99px 4px', background: t.color}}/>
              )}
              {t.shape === 'half-r' && (
                <div style={{width: 36, height: 36, borderRadius: '99px 99px 99px 0', background: t.color}}/>
              )}
              <div style={{fontFamily: FIGMA_TYPE, fontWeight: 600, fontSize: 8.5, letterSpacing:'-0.005em', color:'#0E0E0E'}}>{t.name}</div>
              <div style={{fontFamily:'var(--font-mono)', fontSize: 7.5, color:'#7A7A7A', letterSpacing:'0.02em'}}>{t.color}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Multiplayer ribbon — the avatar trope rendered as identity, not UI */}
      <div style={{marginTop:'auto', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
        <div style={{display:'flex', alignItems:'center'}}>
          {['#F24E1E','#A259FF','#1ABCFE','#0ACF83'].map((c, i) => (
            <div key={i} style={{
              width: 18, height: 18, borderRadius: 99, background: c,
              border:'2px solid #fff', boxShadow:'0 0 0 1px rgba(0,0,0,.08)',
              marginLeft: i ? -7 : 0,
              fontFamily: FIGMA_TYPE, fontWeight: 700, fontSize: 8, color:'#fff',
              display:'inline-flex', alignItems:'center', justifyContent:'center',
            }}>{['S','M','L','J'][i]}</div>
          ))}
        </div>
        <div style={{fontFamily: FIGMA_TYPE, fontWeight: 600, fontSize: 9, letterSpacing:'0.04em', color:'#7A7A7A'}}>Made for many hands.</div>
      </div>
    </div>
  );
};

// ── Perplexity hero — brand identity sheet ────────────────────────────
// Editorial composition on cream paper. The asterisk takes center stage,
// rendered large like a frontispiece. Wordmark sits below in serif. An
// editorial quote acts as brand voice. Color combination strip & ruled
// lines reinforce the scholarly/library feel.
const PerplexityHero = () => {
  const palette = [
    { name:'Ink',   hex:'#0F0F0F', text:'#FBF7EE' },
    { name:'Teal',  hex:'#1F4E47', text:'#FBF7EE' },
    { name:'Sage',  hex:'#5C8C82', text:'#FBF7EE' },
    { name:'Wheat', hex:'#E8DFC8', text:'#1F4E47' },
    { name:'Paper', hex:'#FBF7EE', text:'#1F4E47' },
  ];
  return (
    <div style={{
      height: 400,
      background: 'linear-gradient(180deg, #FCF8EF 0%, #F5EFE0 100%)',
      color:'#0F0F0F', position:'relative', overflow:'hidden',
      display:'flex', flexDirection:'column',
      padding: '22px 24px 24px',
    }}>
      {/* Subtle paper grain — overlapping radial highlights */}
      <div style={{position:'absolute', top: -40, left: -40, width: 180, height: 180, borderRadius:99, background:'radial-gradient(circle, rgba(31,78,71,.05) 0%, transparent 70%)', pointerEvents:'none'}}/>
      <div style={{position:'absolute', bottom: -60, right: -40, width: 200, height: 200, borderRadius:99, background:'radial-gradient(circle, rgba(31,78,71,.04) 0%, transparent 70%)', pointerEvents:'none'}}/>

      {/* Top eyebrow */}
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 10}}>
        <div style={{fontFamily: PERPLEXITY_BODY, fontWeight: 600, fontSize: 8.5, letterSpacing:'0.18em', textTransform:'uppercase', color:'#5C8C82'}}>Identity Folio</div>
        <div style={{fontFamily: PERPLEXITY_BODY, fontWeight: 500, fontSize: 8.5, letterSpacing:'0.04em', color:'#5C8C82'}}>№ 002</div>
      </div>

      {/* Hero — large asterisk + wordmark */}
      <div style={{flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap: 12, marginTop: 4, marginBottom: 14}}>
        <BrandLogoImg brand="perplexity" size={68} radius={16} style={{ boxShadow: '0 6px 18px rgba(31,78,71,.22)' }}/>
        <div style={{
          fontFamily: PERPLEXITY_DISPLAY, fontWeight: 500, fontSize: 32,
          letterSpacing: '-0.025em', color:'#0F0F0F', lineHeight: 1,
        }}>perplexity</div>
        <div style={{
          fontFamily: PERPLEXITY_DISPLAY, fontWeight: 400, fontStyle:'italic', fontSize: 12.5,
          letterSpacing: '-0.005em', color:'#1F4E47', textAlign:'center', maxWidth: 220, lineHeight: 1.35,
        }}>
          "Where curiosity becomes&nbsp;understanding."
        </div>
      </div>

      {/* Type specimen — three weights of FK Display */}
      <div style={{borderTop:'1px solid #E0D6BC', paddingTop: 12, marginBottom: 12}}>
        <div style={{display:'flex', alignItems:'baseline', justifyContent:'space-between'}}>
          {[
            {weight: 400, style:'normal',  label:'Regular'},
            {weight: 400, style:'italic',  label:'Italic'},
            {weight: 600, style:'normal',  label:'Semibold'},
          ].map((w) => (
            <div key={w.label} style={{textAlign:'center', flex:1}}>
              <div style={{fontFamily: PERPLEXITY_DISPLAY, fontWeight: w.weight, fontStyle: w.style, fontSize: 22, letterSpacing:'-0.02em', color:'#1F4E47', lineHeight: 1}}>Aa</div>
              <div style={{fontFamily: PERPLEXITY_BODY, fontWeight: 500, fontSize: 8, letterSpacing:'0.06em', textTransform:'uppercase', color:'#5C8C82', marginTop: 6}}>{w.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Color combination — labelled chips with names embedded */}
      <div style={{display:'flex', gap: 4, height: 36}}>
        {palette.map(p => (
          <div key={p.name} style={{
            flex: 1, borderRadius: 5, background: p.hex,
            display:'flex', alignItems:'flex-end', justifyContent:'flex-start',
            padding: '5px 7px', boxShadow:'inset 0 0 0 1px rgba(0,0,0,0.04)',
          }}>
            <span style={{fontFamily: PERPLEXITY_BODY, fontWeight: 600, fontSize: 7.5, letterSpacing:'0.06em', textTransform:'uppercase', color: p.text}}>{p.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Tesla hero — brand identity sheet, red-dominant ───────────────────
// Tesla red is the dominant surface (the "Plaid" / Roadster register).
// White T mark + tracked-out wordmark, black accents and rules — the
// inverse of the classic black-on-red treatment, with red reading as
// the primary brand color.
const TeslaHero = () => {
  const palette = [
    { name:'Red',     hex:'#E31937', text:'#FFFFFF' },
    { name:'Crimson', hex:'#A6001E', text:'#FFFFFF' },
    { name:'Black',   hex:'#000000', text:'#FFFFFF' },
    { name:'Steel',   hex:'#A6A6A6', text:'#000000' },
    { name:'White',   hex:'#FFFFFF', text:'#000000' },
  ];
  return (
    <div style={{
      height: 400,
      background:'radial-gradient(140% 100% at 50% 25%, #FF2A47 0%, #E31937 45%, #A6001E 100%)',
      color:'#FFFFFF', position:'relative', overflow:'hidden',
      display:'flex', flexDirection:'column',
      padding: '22px 24px 24px',
    }}>
      {/* Top eyebrow */}
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
        <div style={{display:'flex', alignItems:'center', gap: 8}}>
          <span style={{width: 5, height: 5, borderRadius:99, background:'#000000'}}/>
          <span style={{fontFamily: TESLA_TYPE, fontWeight: 700, fontSize: 8.5, letterSpacing:'0.22em', textTransform:'uppercase', color:'rgba(0,0,0,.72)'}}>Identity / 2024</span>
        </div>
        <span style={{fontFamily: TESLA_TYPE, fontWeight: 500, fontSize: 8.5, letterSpacing:'0.16em', color:'rgba(255,255,255,.7)'}}>SR · 003</span>
      </div>

      {/* Center: stacked logomark + wordmark */}
      <div style={{flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap: 14}}>
        <BrandLogoImg brand="tesla" size={68} radius={16} style={{ boxShadow: '0 6px 18px rgba(0,0,0,.20)' }}/>
        <span style={{
          fontFamily: TESLA_TYPE, fontWeight: 600, fontSize: 28,
          letterSpacing: '0.45em', color:'#FFFFFF', textIndent: '0.45em',
          lineHeight: 1,
        }}>TESLA</span>
        <div style={{
          fontFamily: TESLA_TYPE, fontWeight: 500, fontSize: 9, letterSpacing:'0.22em',
          textTransform:'uppercase', color:'rgba(255,255,255,.82)', marginTop: -2,
        }}>Sustainable. Performance. Future.</div>
      </div>

      {/* Black accent rule full-width — high-contrast on red */}
      <div style={{height: 1, background:'#000000', marginBottom: 12, opacity: .65}}/>

      {/* Type specimen — Helvetica Neue weights */}
      <div style={{marginBottom: 12}}>
        <div style={{display:'flex', alignItems:'baseline', justifyContent:'space-between'}}>
          {[
            {weight: 300, label:'Light'},
            {weight: 500, label:'Medium'},
            {weight: 700, label:'Bold'},
            {weight: 900, label:'Black'},
          ].map((w) => (
            <div key={w.label} style={{textAlign:'center', flex:1}}>
              <div style={{fontFamily: TESLA_TYPE, fontWeight: w.weight, fontSize: 20, letterSpacing:'-0.02em', color:'#FFFFFF', lineHeight: 1}}>Aa</div>
              <div style={{fontFamily: TESLA_TYPE, fontWeight: 500, fontSize: 7.5, letterSpacing:'0.14em', textTransform:'uppercase', color:'rgba(0,0,0,.55)', marginTop: 5}}>{w.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Color spec strip */}
      <div style={{display:'flex', gap: 4, height: 32}}>
        {palette.map(p => (
          <div key={p.name} style={{
            flex: 1, borderRadius: 4, background: p.hex,
            display:'flex', alignItems:'flex-end', padding:'4px 6px',
            boxShadow: (p.hex === '#FFFFFF' || p.hex === '#A6A6A6') ? 'inset 0 0 0 1px rgba(0,0,0,0.08)' : 'inset 0 0 0 1px rgba(255,255,255,0.10)',
          }}>
            <span style={{fontFamily: TESLA_TYPE, fontWeight: 700, fontSize: 7, letterSpacing:'0.12em', textTransform:'uppercase', color: p.text}}>{p.name}</span>
          </div>
        ))}
      </div>

      {/* Black edge rule — Tesla's high-contrast crash-bar cue */}
      <div style={{position:'absolute', top:0, right:0, width: 2, height:'100%', background:'#000000', opacity: .8}}/>
    </div>
  );
};

// PART 1 — Inspiration card. The hero JSX is supplied per-brand so each
// card can faithfully express its identity (logo, type, color, UI cues).
// The footer carries only the brand-styled style pill + name + category;
// the palette lives inside the hero so it is shown exactly once and stays
// consistent with the rest of the brand sheet.
const AInspirationCard = ({ name, category, style, hero, sel, onClick }) => (
  <div onClick={onClick} style={{
    background:'var(--bg-elev)', borderRadius: 18,
    boxShadow: sel ? '0 0 0 2px #000, var(--shadow-sm)' : 'var(--shadow-xs), inset 0 0 0 1px var(--line)',
    overflow:'hidden', display:'flex', flexDirection:'column',
    cursor:'pointer', position:'relative',
  }}>
    {sel && (
      <div style={{position:'absolute', top:12, right:12, zIndex:3, width:22, height:22, borderRadius:99, background:'#000', color:'#fff', display:'inline-flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 0 2px #fff'}}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
    )}
    {/* Hero — brand-specific identity sheet */}
    {hero}
    {/* Info footer — brand-styled pill + name + category */}
    <div style={{padding: '14px 16px 16px', display:'flex', flexDirection:'column', gap: 8, flex:1}}>
      <div style={{
        display:'inline-flex', alignSelf:'flex-start', alignItems:'center', gap: 6,
        padding: style.pill.padding || '4px 10px',
        borderRadius: style.pill.radius != null ? style.pill.radius : 99,
        background: style.pill.bg,
        color: style.pill.color,
        fontFamily: style.pill.font || 'var(--font-display)',
        fontWeight: style.pill.weight != null ? style.pill.weight : 600,
        fontStyle: style.pill.italic ? 'italic' : 'normal',
        fontSize: style.pill.size || 10.5,
        letterSpacing: style.pill.tracking || '-0.005em',
        textTransform: style.pill.transform || 'none',
        boxShadow: style.pill.shadow,
        border: style.pill.border,
      }}>
        {style.pill.dot && (
          <span style={{
            width: style.pill.dotSize || 5, height: style.pill.dotSize || 5,
            borderRadius: 99, background: style.pill.dot,
            boxShadow: style.pill.dotGlow,
          }}/>
        )}
        {style.label}
      </div>
      <div>
        <div style={{fontFamily:'var(--font-display)', fontSize: 15, fontWeight: 700, letterSpacing:'-0.018em', color:'#000', lineHeight: 1.05}}>{name}</div>
        <div style={{fontSize: 11, color:'var(--fg-3)', marginTop: 2}}>{category}</div>
      </div>
    </div>
  </div>
);

// Visual style directions — full preview images for each register.
const visualStyleImage = (id) => {
  const paths = {
    'modern-minimal': __assets['assets/min/visual-style-modern-minimal.jpg'],
    'bold-graphic': __assets['assets/min/visual-style-bold-graphic.jpg'],
    'premium-editorial': __assets['assets/min/visual-style-premium-editorial.jpg'],
    'futuristic-digital': __assets['assets/min/visual-style-futuristic-digital.jpg'],
  };
  return paths[id];
};

const VISUAL_STYLE_OPTIONS = [
  {
    id: 'modern-minimal',
    name: 'Modern Minimal',
    descriptor: 'Clean, refined, spacious and highly usable.',
  },
  {
    id: 'bold-graphic',
    name: 'Bold Graphic',
    descriptor: 'Striking, energetic and confident.',
  },
  {
    id: 'premium-editorial',
    name: 'Premium Editorial',
    descriptor: 'Sophisticated, refined and tasteful.',
  },
  {
    id: 'futuristic-digital',
    name: 'Futuristic Digital',
    descriptor: 'Advanced, AI-native and built for the future.',
  },
];

// Bespoke style swatches — each a self-contained composition that telegraphs
// its register through type, color, scale and density (no literal UI screenshots).
const StyleSwatch = ({ id }) => {
  const tag = (text, color) => (
    <div style={{ position: 'absolute', top: 18, left: 24, fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 500, letterSpacing: '0.14em', color }}>{text}</div>
  );
  if (id === 'modern-minimal') {
    return (
      <div style={{ height: 240, background: '#FFFFFF', position: 'relative', overflow: 'hidden' }}>
        {tag('GROTESQUE · LIGHT', '#B4B4B8')}
        <div style={{ position: 'absolute', top: 44, left: 24, right: 24, height: 1, background: '#ECECEE' }} />
        <div style={{ position: 'absolute', top: 58, left: 24, display: 'flex', gap: 6 }}>
          {['#111113', '#9A9AA0', '#E6E6E8'].map((c) => (
            <span key={c} style={{ width: 13, height: 13, borderRadius: 3, background: c, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.05)' }} />
          ))}
        </div>
        <div style={{ position: 'absolute', left: 20, bottom: 6, fontFamily: 'var(--font-display)', fontWeight: 300, fontSize: 108, letterSpacing: '-0.045em', color: '#0E0E0E', lineHeight: 0.86 }}>Aa</div>
      </div>
    );
  }
  if (id === 'bold-graphic') {
    return (
      <div style={{ height: 240, background: '#F3F3F4', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -42, right: -34, width: 176, height: 176, borderRadius: 999, background: '#1B4DFF' }} />
        <div style={{ position: 'absolute', top: 70, left: 24, width: 56, height: 56, background: '#FD7947', transform: 'rotate(9deg)' }} />
        <div style={{ position: 'absolute', left: 12, bottom: -26, fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 158, letterSpacing: '-0.065em', color: '#0B0B0C', lineHeight: 0.78 }}>Aa</div>
        {tag('GROTESQUE · BLACK', '#0B0B0C')}
      </div>
    );
  }
  if (id === 'premium-editorial') {
    return (
      <div style={{ height: 240, background: '#F1F0ED', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: '60%', width: 1, background: '#D9D7D1' }} />
        <div style={{ position: 'absolute', left: 22, top: 50, fontFamily: 'Georgia, "Times New Roman", serif', fontStyle: 'italic', fontWeight: 500, fontSize: 100, color: '#18160F', lineHeight: 0.86 }}>Aa</div>
        <div style={{ position: 'absolute', right: 22, top: 58, width: 72, display: 'flex', flexDirection: 'column', gap: 7 }}>
          {[1, 0.82, 0.92, 0.6].map((w, i) => (
            <div key={i} style={{ height: 4, width: `${w * 100}%`, background: '#CFCCC4', borderRadius: 2 }} />
          ))}
        </div>
        <div style={{ position: 'absolute', left: 24, bottom: 18, fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 15, color: '#56524A' }}>Quietly considered.</div>
        {tag('SERIF · ITALIC', '#A39E92')}
      </div>
    );
  }
  // futuristic-digital
  return (
    <div style={{ height: 240, background: '#0A0C10', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(54,224,255,.10) 1px, transparent 1px), linear-gradient(90deg, rgba(54,224,255,.10) 1px, transparent 1px)', backgroundSize: '26px 26px' }} />
      <div style={{ position: 'absolute', bottom: -44, right: -24, width: 168, height: 168, borderRadius: 999, background: 'radial-gradient(circle, rgba(54,224,255,.45), transparent 70%)' }} />
      <div style={{ position: 'absolute', top: 40, right: 26, width: 46, height: 46, borderRadius: 9, boxShadow: 'inset 0 0 0 1.5px #36E0FF' }} />
      <div style={{ position: 'absolute', top: 54, right: 40, width: 18, height: 18, borderRadius: 99, background: '#36E0FF' }} />
      <div style={{ position: 'absolute', left: 20, bottom: 12, fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: 96, letterSpacing: '-0.02em', color: '#FFFFFF', lineHeight: 0.86 }}>Aa</div>
      {tag('MONO · NEON', '#36E0FF')}
    </div>
  );
};

const AVisualStyleCard = ({ id, name, descriptor, sel, onClick }) => (
  <div
    role="button"
    tabIndex={0}
    onClick={onClick}
    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
    style={{
      background: 'var(--bg-elev)', borderRadius: 16,
      boxShadow: sel ? '0 0 0 2px #000, var(--shadow-sm)' : 'var(--shadow-xs), inset 0 0 0 1px var(--line)',
      overflow: 'hidden', display: 'flex', flexDirection: 'column',
      cursor: 'pointer', position: 'relative', textAlign: 'left',
    }}
  >
    {sel && (
      <div style={{
        position: 'absolute', top: 10, right: 10, zIndex: 2,
        width: 22, height: 22, borderRadius: 99, background: '#000', color: '#fff',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 0 0 2px #fff',
      }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
    )}
    <StyleSwatch id={id} />
    <div style={{ padding: '12px 14px 14px' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, letterSpacing: '-0.018em', color: '#000', lineHeight: 1.05 }}>{name}</div>
      <div style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 3, lineHeight: 1.35 }}>{descriptor}</div>
    </div>
  </div>
);

// Shared read/write for Step 2 picks, namespaced under brand data.step2 so it
// never collides with the generated data.palette / data.typography, etc.
const useStep2 = () => {
  const { draft, setField } = useBrandDraft();
  const step2 = (draft && draft.data && draft.data.step2) || {};
  const setStep2 = (patch) =>
    setField('data', { ...((draft && draft.data) || {}), step2: { ...step2, ...patch } });
  return { step2, setStep2 };
};

// Expandable visual-style picker — collapsed: 4 direction cards only;
// expanded: cards + refinement sliders for the selected direction.
const AVisualStyleSection = () => {
  const { draft, setField } = useBrandDraft();
  const { step2, setStep2 } = useStep2();
  const [expanded, setExpanded] = useState(false);
  const [selectedId, setSelectedId] = useState((draft && draft.style_id) || null);
  const selected = VISUAL_STYLE_OPTIONS.find((o) => o.id === selectedId) || VISUAL_STYLE_OPTIONS[0];
  const refine = step2.refine || { bold: 50, modern: 50, cool: 50 };
  const setRefine = (key, v) => setStep2({ refine: { ...refine, [key]: v } });
  const brandId = draft && draft.id;
  const [picking, setPicking] = useState(false);
  const letAIChoose = async () => {
    if (!brandId || picking) return;
    setPicking(true);
    const opts = VISUAL_STYLE_OPTIONS.map((o) => ({ id: o.id, label: o.name, desc: o.descriptor }));
    const { result } = await apiAssist(brandId, 'pick_style', opts);
    if (result && result.choice) { setSelectedId(result.choice); setField('style_id', result.choice); }
    setPicking(false);
  };

  return (
    <div style={{ marginBottom: 24 }}>
      <ASectionHead
        n="01"
        title="Visual style"
        sub="Each card is a full preview of that visual direction."
        ai onAI={letAIChoose} aiBusy={picking}
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {VISUAL_STYLE_OPTIONS.map((opt) => (
          <AVisualStyleCard
            key={opt.id}
            id={opt.id}
            name={opt.name}
            descriptor={opt.descriptor}
            sel={selectedId === opt.id}
            onClick={() => { setSelectedId(opt.id); setField('style_id', opt.id); }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 14 }}>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '9px 16px', borderRadius: 999,
            background: 'var(--bg-elev)', color: 'var(--fg-1)',
            boxShadow: 'var(--shadow-xs), inset 0 0 0 1px var(--line)',
            fontSize: 12.5, fontWeight: 600, border: 0, cursor: 'pointer',
          }}
        >
          {expanded ? 'Hide refinement' : 'Refine style direction'}
          <svg
            width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform .15s ease' }}
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
      </div>
      {expanded && (
        <div style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: 10.5, color: 'var(--fg-3)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Refine within {selected.name}
            </span>
            <div style={{ flex: 1, height: 1, background: 'var(--line)' }}/>
            <span style={{ fontSize: 10.5, color: 'var(--fg-4)', fontFamily: 'var(--font-mono)' }}>3 attributes</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            <ASlider left="Quiet" right="Bold" value={refine.bold} onChange={(v) => setRefine('bold', v)} />
            <ASlider left="Classic" right="Modern" value={refine.modern} onChange={(v) => setRefine('modern', v)} />
            <ASlider left="Warm" right="Cool" value={refine.cool} onChange={(v) => setRefine('cool', v)} />
          </div>
        </div>
      )}
    </div>
  );
};

// Draggable refinement slider (native range input for reliable interaction).
const ASlider = ({ left, right, value, onChange }) => (
  <div style={{
    background:'var(--bg-elev)', borderRadius: 12,
    boxShadow:'var(--shadow-xs), inset 0 0 0 1px var(--line)',
    padding: '12px 14px',
  }}>
    <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', fontSize:11, fontWeight:600, color:'var(--fg-3)', letterSpacing:'0.05em', textTransform:'uppercase', marginBottom:8}}>
      <span>{left}</span><span>{right}</span>
    </div>
    <input
      type="range" min="0" max="100" value={value}
      onChange={(e) => onChange && onChange(Number(e.target.value))}
      style={{ width: '100%', accentColor: '#000', cursor: 'pointer', display: 'block' }}
    />
  </div>
);

// Palette option — a labeled set of swatches
const APaletteOption = ({ name, mood, palette, sel, onClick }) => (
  <div onClick={onClick} style={{
    background:'var(--bg-elev)', borderRadius: 14,
    boxShadow: sel ? '0 0 0 2px #000, var(--shadow-xs)' : 'var(--shadow-xs), inset 0 0 0 1px var(--line)',
    padding: 14, display:'flex', flexDirection:'column', gap: 10,
    cursor:'pointer', position:'relative',
  }}>
    {sel && (
      <div style={{position:'absolute', top: 10, right: 10, width: 18, height: 18, borderRadius: 99, background: '#000', color:'#fff', display:'inline-flex', alignItems:'center', justifyContent:'center'}}>
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
    )}
    <div style={{display:'flex', gap: 4, height: 56}}>
      {palette.map((c, i) => (
        <div key={i} style={{flex: i === 0 ? 1.4 : 1, borderRadius: 6, background: c, boxShadow:'inset 0 0 0 1px rgba(0,0,0,0.06)'}}/>
      ))}
    </div>
    <div>
      <div style={{fontFamily:'var(--font-display)', fontSize: 13, fontWeight: 700, letterSpacing:'-0.015em', color:'var(--fg-1)'}}>{name}</div>
      <div style={{fontSize: 10.5, color:'var(--fg-3)', marginTop: 1}}>{mood}</div>
    </div>
  </div>
);

// Font pair option — display + body sample
const AFontPairOption = ({ name, mood, display, body, sel, onClick }) => (
  <div onClick={onClick} style={{
    background:'var(--bg-elev)', borderRadius: 14,
    boxShadow: sel ? '0 0 0 2px #000, var(--shadow-xs)' : 'var(--shadow-xs), inset 0 0 0 1px var(--line)',
    padding: 14, display:'flex', flexDirection:'column', gap: 10,
    cursor:'pointer', position:'relative',
  }}>
    {sel && (
      <div style={{position:'absolute', top: 10, right: 10, width: 18, height: 18, borderRadius: 99, background: '#000', color:'#fff', display:'inline-flex', alignItems:'center', justifyContent:'center'}}>
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
    )}
    <div style={{
      background: 'var(--bg)', borderRadius: 8,
      boxShadow:'inset 0 0 0 1px var(--line)',
      padding: '12px 14px', minHeight: 78,
      display:'flex', flexDirection:'column', justifyContent:'space-between',
    }}>
      <div style={{
        fontFamily: display.font, fontWeight: display.weight,
        fontSize: 24, letterSpacing: display.tracking || '-0.025em',
        color:'#000', lineHeight: 1,
      }}>{display.sample || 'Aa'}</div>
      <div style={{
        fontFamily: body.font, fontWeight: body.weight,
        fontSize: 11, color:'var(--fg-2)', lineHeight: 1.45,
      }}>{body.sample || 'The quick brown fox jumps.'}</div>
    </div>
    <div>
      <div style={{fontFamily:'var(--font-display)', fontSize: 13, fontWeight: 700, letterSpacing:'-0.015em', color:'var(--fg-1)'}}>{name}</div>
      <div style={{fontSize: 10.5, color:'var(--fg-3)', marginTop: 1, fontFamily:'var(--font-mono)'}}>{display.name} / {body.name}</div>
    </div>
  </div>
);

// Curated palettes for the "build it piece by piece" path.
const PALETTE_OPTIONS = [
  { name:'Quiet earth', mood:'warm · paper', palette:['#1F232A', '#A8421F', '#FDBA50', '#F4EFE7', '#E8D9B5'] },
  { name:'Sun & sea', mood:'optimistic · bright', palette:['#0F1115', '#FD7947', '#FDBA50', '#44D9C7', '#F4EFE7'] },
  { name:'Studio mono', mood:'quiet · single accent', palette:['#000000', '#1A1A1A', '#7A7A7A', '#E8E8E8', '#FD7947'] },
  { name:'Cool clinical', mood:'technical · trustworthy', palette:['#0F1115', '#22272F', '#A4ADBA', '#E5E7EB', '#3B82F6'] },
  { name:'Garden', mood:'organic · soft', palette:['#1F2A22', '#5C7A4F', '#A8B89A', '#F4EFE7', '#FDBBC0'] },
];

// Open-source (Google Fonts) type pairings, previewed in the actual fonts.
const OPEN_SOURCE_FONT_PAIRS = [
  { id:'fraunces-inter', name:'Editorial', mood:'warm · literary', display:{family:'Fraunces', category:'serif', weight:600}, body:{family:'Inter', category:'sans-serif', weight:400} },
  { id:'space-inter', name:'Studio', mood:'modern · technical', display:{family:'Space Grotesk', category:'sans-serif', weight:600}, body:{family:'Inter', category:'sans-serif', weight:400} },
  { id:'playfair-source', name:'Classic', mood:'refined · timeless', display:{family:'Playfair Display', category:'serif', weight:700}, body:{family:'Source Sans 3', category:'sans-serif', weight:400} },
  { id:'archivo-libre', name:'Confident', mood:'bold · graphic', display:{family:'Archivo', category:'sans-serif', weight:800}, body:{family:'Libre Franklin', category:'sans-serif', weight:400} },
  { id:'dmserif-dmsans', name:'Elegant', mood:'high-contrast · modern', display:{family:'DM Serif Display', category:'serif', weight:400}, body:{family:'DM Sans', category:'sans-serif', weight:400} },
  { id:'sora-plex', name:'Futuristic', mood:'digital · precise', display:{family:'Sora', category:'sans-serif', weight:700}, body:{family:'IBM Plex Sans', category:'sans-serif', weight:400} },
];

const fontFamilyCss = (face) => '"' + face.family + '", ' + (FONT_FALLBACK[face.category] || 'sans-serif');

const INSPIRATION_BRANDS = [
  { name:'Apple', category:'Consumer tech · Premium', hero:<AppleHero/>, style:{ label:'Minimal · Refined', pill:{ bg:'#FFFFFF', color:'#1D1D1F', font: APPLE_DISPLAY, weight: 500, tracking:'-0.005em', shadow:'inset 0 0 0 1px #D2D2D7', dot:'#1D1D1F' } } },
  { name:'Figma', category:'Design tool · Collaborative', hero:<FigmaHero/>, style:{ label:'Playful · Vibrant', pill:{ bg:'#0E0E0E', color:'#FFFFFF', font: FIGMA_TYPE, weight: 700, tracking:'-0.005em', dot:'#A259FF', dotSize: 6 } } },
  { name:'Perplexity', category:'AI search · Editorial', hero:<PerplexityHero/>, style:{ label:'Editorial · Considered', pill:{ bg:'#FBF7EE', color:'#1F4E47', font: PERPLEXITY_DISPLAY, weight: 500, italic: true, tracking:'-0.005em', size: 11.5, shadow:'inset 0 0 0 1px #E8DFC8', dot:'#1F4E47' } } },
  { name:'Tesla', category:'Automotive · Technology', hero:<TeslaHero/>, style:{ label:'Bold · Technical', pill:{ bg:'#E31937', color:'#FFFFFF', font: TESLA_TYPE, weight: 700, tracking:'0.18em', transform:'uppercase', size: 9.5, padding:'5px 11px', dot:'#000000', dotSize: 5 } } },
];

// A user-uploaded font, previewed in that font, selectable + removable.
const ACustomFontCard = ({ family, sel, onClick, onRemove }) => (
  <div onClick={onClick} style={{
    background:'var(--bg-elev)', borderRadius: 14, position:'relative',
    boxShadow: sel ? '0 0 0 2px #000, var(--shadow-xs)' : 'var(--shadow-xs), inset 0 0 0 1px var(--line)',
    padding: 14, display:'flex', flexDirection:'column', gap: 10, cursor:'pointer',
  }}>
    {sel && (
      <div style={{position:'absolute', top: 10, right: 10, width: 18, height: 18, borderRadius: 99, background: '#000', color:'#fff', display:'inline-flex', alignItems:'center', justifyContent:'center'}}>
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
    )}
    <div style={{ background:'var(--bg)', borderRadius: 8, boxShadow:'inset 0 0 0 1px var(--line)', padding:'12px 14px', minHeight: 78, display:'flex', flexDirection:'column', justifyContent:'space-between' }}>
      <div style={{ fontFamily:'"' + family + '", sans-serif', fontSize: 24, color:'#000', lineHeight: 1 }}>Aa</div>
      <div style={{ fontFamily:'"' + family + '", sans-serif', fontSize: 11, color:'var(--fg-2)', lineHeight: 1.45 }}>The quick brown fox jumps over the lazy dog.</div>
    </div>
    <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:8}}>
      <div style={{minWidth:0}}>
        <div style={{fontFamily:'var(--font-display)', fontSize: 13, fontWeight: 700, letterSpacing:'-0.015em', color:'var(--fg-1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{family}</div>
        <div style={{fontSize: 10.5, color:'var(--fg-3)', marginTop: 1, fontFamily:'var(--font-mono)'}}>Your font</div>
      </div>
      <button onClick={(e) => { e.stopPropagation(); onRemove(); }} aria-label={'Remove ' + family} style={{width:22, height:22, borderRadius:99, background:'transparent', border:0, cursor:'pointer', color:'var(--fg-3)', display:'inline-flex', alignItems:'center', justifyContent:'center', flex:'0 0 auto'}}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  </div>
);

// Dashed "upload your font" card.
const AUploadFontCard = ({ onPick }) => {
  const ref = React.useRef(null);
  return (
    <div onClick={() => ref.current && ref.current.click()} style={{
      borderRadius: 14, minHeight: 140, cursor:'pointer',
      boxShadow:'inset 0 0 0 1.5px var(--line)', background:'var(--bg)',
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap: 8, textAlign:'center', padding: 14,
    }}>
      <input ref={ref} type="file" accept=".ttf,.otf,.woff,.woff2,font/*" style={{display:'none'}}
        onChange={(e) => { const f = e.target.files && e.target.files[0]; e.target.value = ''; onPick(f); }} />
      <div style={{width: 30, height: 30, borderRadius: 8, background:'var(--bg-elev)', boxShadow:'inset 0 0 0 1px var(--line)', display:'inline-flex', alignItems:'center', justifyContent:'center'}}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--fg-2)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
      </div>
      <div style={{fontFamily:'var(--font-display)', fontSize: 13, fontWeight: 700, color:'#000'}}>Upload your font</div>
      <div style={{fontSize: 10.5, color:'var(--fg-3)', fontFamily:'var(--font-mono)'}}>.ttf · .otf · .woff · .woff2</div>
    </div>
  );
};

// Typography section — open-source pairs, custom uploads, and Let AI choose.
const ATypographySection = () => {
  const { draft } = useBrandDraft();
  const { step2, setStep2 } = useStep2();
  const brandId = draft && draft.id;
  const customFonts = step2.custom_fonts || [];
  const [picking, setPicking] = React.useState(false);
  const [uploadErr, setUploadErr] = React.useState('');

  React.useEffect(() => {
    OPEN_SOURCE_FONT_PAIRS.forEach((p) => { ensureGoogleFont(p.display.family); ensureGoogleFont(p.body.family); });
  }, []);
  React.useEffect(() => {
    customFonts.forEach((cf) => registerCustomFont(cf.family, cf.dataUrl));
  }, [customFonts]);

  const pickFont = async () => {
    if (!brandId || picking) return;
    setPicking(true);
    const opts = OPEN_SOURCE_FONT_PAIRS.map((p) => ({ id: p.id, label: p.name, desc: p.mood + ' — ' + p.display.family + ' / ' + p.body.family }));
    const { result } = await apiAssist(brandId, 'pick_font', opts);
    if (result && result.choice) setStep2({ font: result.choice });
    setPicking(false);
  };

  const onUpload = async (file) => {
    setUploadErr('');
    if (!file) return;
    if (!/\.(ttf|otf|woff2?|woff)$/i.test(file.name)) { setUploadErr('Use a .ttf, .otf, .woff or .woff2 file.'); return; }
    if (file.size > 3 * 1024 * 1024) { setUploadErr('Font file must be under 3 MB.'); return; }
    let dataUrl;
    try { dataUrl = await readFileAsDataURL(file); } catch { setUploadErr('Could not read that file.'); return; }
    const family = file.name.replace(/\.(ttf|otf|woff2?|woff)$/i, '').replace(/[-_]+/g, ' ').trim() || 'Custom font';
    const id = 'c' + Date.now();
    await registerCustomFont(family, dataUrl);
    setStep2({ custom_fonts: [...customFonts, { id, family, dataUrl }], font: 'custom:' + id });
  };
  const removeCustom = (id) => {
    setStep2({
      custom_fonts: customFonts.filter((c) => c.id !== id),
      font: step2.font === 'custom:' + id ? null : step2.font,
    });
  };

  return (
    <div style={{marginBottom: 12}}>
      <ASectionHead n="03" title="Typography" sub="Open-source pairs previewed live — or upload your own font." ai onAI={pickFont} aiBusy={picking}/>
      <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap: 10}}>
        {OPEN_SOURCE_FONT_PAIRS.map((p) => (
          <AFontPairOption
            key={p.id}
            name={p.name} mood={p.mood}
            sel={step2.font === p.id}
            onClick={() => setStep2({ font: step2.font === p.id ? null : p.id })}
            display={{ font: fontFamilyCss(p.display), name: p.display.family, weight: p.display.weight, sample: 'Aa' }}
            body={{ font: fontFamilyCss(p.body), name: p.body.family, weight: p.body.weight, sample: 'The quick brown fox jumps over the lazy dog.' }}
          />
        ))}
        {customFonts.map((cf) => (
          <ACustomFontCard key={cf.id} family={cf.family}
            sel={step2.font === 'custom:' + cf.id}
            onClick={() => setStep2({ font: step2.font === 'custom:' + cf.id ? null : 'custom:' + cf.id })}
            onRemove={() => removeCustom(cf.id)} />
        ))}
        <AUploadFontCard onPick={onUpload} />
      </div>
      {uploadErr && <div style={{marginTop:10, fontSize:11.5, color:'#A8421F'}}>{uploadErr}</div>}
    </div>
  );
};

const DirA_Step2_Style = () => {
  const { draft } = useBrandDraft();
  const { step2, setStep2 } = useStep2();
  const brandId = draft && draft.id;
  const [picking, setPicking] = React.useState('');

  // Load all preview fonts once when the step opens.
  React.useEffect(() => {
    OPEN_SOURCE_FONT_PAIRS.forEach((p) => { ensureGoogleFont(p.display.family); ensureGoogleFont(p.body.family); });
  }, []);

  const pickPalette = async () => {
    if (!brandId || picking) return;
    setPicking('palette');
    const opts = PALETTE_OPTIONS.map((p) => ({ id: p.name, label: p.name, desc: p.mood }));
    const { result } = await apiAssist(brandId, 'pick_palette', opts);
    if (result && result.choice) setStep2({ palette: result.choice });
    setPicking('');
  };

  return (
  <AWizardLayout
    step={2}
    title="Choose your visual direction."
    subtitle="Start from a brand you admire, or build it piece by piece. You can mix both."
    status="Draft"
    progress="Step 2 of 5"
    nextLabel="Continue to Name"
    onNext={() => {}}
  >
    {/* ============ PART 1 · Start from an existing brand ============ */}
    <ASectionHead
      title="Start from a brand you admire"
      sub="Fluid will adapt the whole identity to your brief — type, color, voice, and the way it shows up."
      count="4 of 28"
    />
    <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap: 14}}>
      {INSPIRATION_BRANDS.map((b) => (
        <AInspirationCard
          key={b.name}
          name={b.name} category={b.category} hero={b.hero} style={b.style}
          sel={step2.inspiration === b.name}
          onClick={() => setStep2({ inspiration: step2.inspiration === b.name ? null : b.name })}
        />
      ))}
    </div>
    {/* Expand hint */}
    <div style={{display:'flex', alignItems:'center', justifyContent:'center', marginTop: 14, marginBottom: 28}}>
      <button style={{
        display:'inline-flex', alignItems:'center', gap: 8,
        padding:'9px 16px', borderRadius: 999,
        background:'var(--bg-elev)', color:'var(--fg-1)',
        boxShadow:'var(--shadow-xs), inset 0 0 0 1px var(--line)',
        fontSize: 12.5, fontWeight: 600, border:0, cursor:'pointer',
      }}>
        Show 24 more brands
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
    </div>

    {/* Section divider */}
    <div style={{display:'flex', alignItems:'center', gap:14, marginBottom: 22}}>
      <div style={{flex:1, height:1, background:'var(--line)'}}/>
      <span style={{fontSize:11, color:'var(--fg-3)', fontWeight:600, letterSpacing:'0.08em', textTransform:'uppercase'}}>Or</span>
      <div style={{flex:1, height:1, background:'var(--line)'}}/>
    </div>

    {/* ============ PART 2 · Build it piece by piece ============ */}
    <div style={{marginBottom: 6}}>
      <h2 style={{
        fontFamily:'var(--font-display)', fontWeight: 800, fontSize: 26,
        letterSpacing:'-0.025em', lineHeight: 1, margin: 0, color: '#000',
      }}>Build it piece by piece.</h2>
      <p style={{margin:'8px 0 24px', fontSize: 13, color:'var(--fg-2)', lineHeight: 1.5, maxWidth: 600}}>
        Hand-pick each ingredient. Let Fluid choose any one (or all) by tapping <span style={{fontWeight:700, color:'var(--fg-1)'}}>Let AI choose</span>.
      </p>
    </div>

    {/* 2a · Visual style — 4 direction previews, expandable refinement */}
    <AVisualStyleSection />

    {/* 2b · Color palette */}
    <div style={{marginBottom: 24}}>
      <ASectionHead n="02" title="Color palette" sub="Hand-picked palettes that carry the chosen register." ai onAI={pickPalette} aiBusy={picking === 'palette'}/>
      <div style={{display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap: 10}}>
        {PALETTE_OPTIONS.map((p) => (
          <APaletteOption key={p.name} name={p.name} mood={p.mood} palette={p.palette}
            sel={step2.palette === p.name}
            onClick={() => setStep2({ palette: step2.palette === p.name ? null : p.name })}
          />
        ))}
      </div>
    </div>

    {/* 2c · Typography — open-source pairs + custom uploads */}
    <ATypographySection />
  </AWizardLayout>
  );
};

// =====================================================================
// A4 · Step 3 · Name Generation Screen
// 9 name cards in a 3×3 grid. Each card carries the name as the
// hero, a one-line rationale, domain status, and a fit-score bar so
// the agent's reasoning is legible at a glance. Selected card gets a
// black ring; favorited cards get a coral heart.
// =====================================================================
// Compact name card — just the name, selectable, with a like (heart) toggle.
const ANameCard = ({ n, sel, liked, onClick, onLike }) => (
  <div onClick={onClick} style={{
    position:'relative', background:'var(--bg-elev)', borderRadius:12,
    padding:'16px 30px 16px 14px', minHeight:58,
    boxShadow: sel ? '0 0 0 2px #000, var(--shadow-sm)' : 'var(--shadow-xs), inset 0 0 0 1px var(--line)',
    display:'flex', alignItems:'center', cursor:'pointer',
  }}>
    <span style={{
      fontFamily:'var(--font-display)', fontWeight:700, fontSize:17,
      letterSpacing:'-0.02em', color:'#000',
      overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'100%',
    }}>{n}</span>
    <button onClick={(e) => { e.stopPropagation(); onLike(); }} aria-label={liked ? 'Unlike ' + n : 'Like ' + n} style={{
      position:'absolute', top:8, right:6, width:22, height:22, borderRadius:99,
      background:'transparent', border:0, cursor:'pointer', display:'inline-flex', alignItems:'center', justifyContent:'center',
    }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill={liked ? '#FD7947' : 'none'} stroke={liked ? '#FD7947' : 'var(--fg-4)'} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
    </button>
  </div>
);

const NAME_GRID = 'repeat(auto-fill, minmax(150px, 1fr))';

const DirA_Step3_Name = () => {
  const { draft, setField } = useBrandDraft();
  const chosen = (draft && draft.name_choice) || null;
  const chooseName = (name) => { setField('name_choice', name); setField('name', name); };

  const brandId = draft && draft.id;
  const hasBrief = !!(draft && String(draft.brief || '').trim());
  // Seed from anything cached on the brand (so resuming shows the same set).
  const cachedNames = (draft && draft.data && draft.data.names) || [];
  const cachedLiked = (draft && draft.data && draft.data.liked_names) || [];
  const [names, setNames] = React.useState(cachedNames);
  const [liked, setLiked] = React.useState(cachedLiked);
  const [likedOpen, setLikedOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const requestedFor = React.useRef(null);

  // Persist names + liked together, merging onto whatever else is in data.
  const persist = React.useCallback((nextNames, nextLiked) => {
    setField('data', { ...((draft && draft.data) || {}), names: nextNames, liked_names: nextLiked });
  }, [draft, setField]);

  const toggleLike = (name) => {
    const next = liked.includes(name) ? liked.filter((x) => x !== name) : [...liked, name];
    setLiked(next);
    persist(names, next);
  };

  const generate = React.useCallback(async () => {
    if (!brandId) return;
    setLoading(true); setError('');
    const res = await apiGenerateNames(brandId);
    if (res.error) setError(res.error);
    else { setNames(res.names); persist(res.names, liked); }
    setLoading(false);
  }, [brandId, persist, liked]);

  // Auto-generate once when the step opens with a brief but no names yet.
  React.useEffect(() => {
    if (!brandId || !hasBrief) return;
    if (names.length > 0) return;
    if (requestedFor.current === brandId) return;
    requestedFor.current = brandId;
    generate();
  }, [brandId, hasBrief, names.length, generate]);

  const toolBtn = {
    padding:'10px 14px', borderRadius:12, fontSize:12.5, fontWeight:600,
    display:'inline-flex', alignItems:'center', gap:8, border:0, cursor:'pointer',
  };

  return (
  <AWizardLayout
    step={3}
    title="Find the right name."
    subtitle="Fluid drafts 50 names from your brief — pick one, like your favorites, or type your own."
    status="Draft"
    progress="Step 3 of 5"
    nextLabel="Continue to Logo"
    onNext={() => {}}
    isThinking={loading}
  >
    {/* Top toolbar — own name, liked names, regenerate */}
    <div style={{display:'flex', gap:10, alignItems:'center', marginBottom:16}}>
      <div style={{
        flex:1, display:'flex', alignItems:'center', gap:10,
        background:'var(--bg-elev)', borderRadius:12,
        boxShadow:'var(--shadow-xs), inset 0 0 0 1px var(--line)',
        padding:'10px 14px',
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--fg-3)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v16M4 12h16"/></svg>
        <input
          placeholder="Type your own name…"
          onKeyDown={(e) => { if (e.key === 'Enter' && e.currentTarget.value.trim()) chooseName(e.currentTarget.value.trim()); }}
          style={{flex:1, border:0, background:'transparent', outline:'none', fontSize:13, color:'var(--fg-1)', fontFamily:'inherit'}}
        />
        <span style={{fontSize:10.5, color:'var(--fg-4)', fontFamily:'var(--font-mono)'}}>↵</span>
      </div>
      <button onClick={() => setLikedOpen((o) => !o)} style={{
        ...toolBtn, background:'var(--bg-elev)', color:'var(--fg-1)',
        boxShadow:'var(--shadow-xs), inset 0 0 0 1px ' + (likedOpen ? '#000' : 'var(--line)'),
      }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill={liked.length ? '#FD7947' : 'none'} stroke={liked.length ? '#FD7947' : 'var(--fg-2)'} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        Liked Names{liked.length ? ' (' + liked.length + ')' : ''}
      </button>
      <button onClick={() => !loading && generate()} disabled={loading || !brandId} style={{
        ...toolBtn, background:'#000', color:'#fff',
        cursor: loading ? 'default' : 'pointer', opacity: loading || !brandId ? 0.6 : 1,
      }}>
        <Sparkle size={12} color="#fff"/> {names.length ? 'Regenerate' : 'Generate names'}
      </button>
    </div>

    {/* Collapsible liked-names pane */}
    {likedOpen && (
      <div style={{
        marginBottom:16, padding:'16px 18px', borderRadius:14,
        background:'var(--bg-elev)', boxShadow:'inset 0 0 0 1px var(--line)',
      }}>
        <div className="eyebrow" style={{color:'var(--fg-3)', marginBottom:12}}>Liked names · {liked.length}</div>
        {liked.length === 0 ? (
          <div style={{fontSize:12.5, color:'var(--fg-3)'}}>Tap the heart on any name to save it here.</div>
        ) : (
          <div style={{display:'flex', flexWrap:'wrap', gap:8}}>
            {liked.map((name) => {
              const sel = chosen === name;
              return (
                <div key={name} style={{
                  display:'inline-flex', alignItems:'center', gap:8,
                  borderRadius:99, padding:'6px 6px 6px 14px',
                  background: sel ? '#000' : 'var(--bg)',
                  boxShadow: sel ? 'none' : 'inset 0 0 0 1px var(--line)',
                }}>
                  <span onClick={() => chooseName(name)} style={{fontFamily:'var(--font-display)', fontWeight:700, fontSize:14, color: sel ? '#fff' : '#000', cursor:'pointer'}}>{name}</span>
                  <button onClick={() => toggleLike(name)} aria-label={'Remove ' + name} style={{width:20, height:20, borderRadius:99, background:'transparent', border:0, cursor:'pointer', color: sel ? 'rgba(255,255,255,.7)' : 'var(--fg-3)', display:'inline-flex', alignItems:'center', justifyContent:'center'}}>
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    )}

    {error && (
      <div style={{
        marginBottom:16, padding:'12px 14px', borderRadius:12,
        background:'rgba(253,121,71,.10)', boxShadow:'inset 0 0 0 1px rgba(253,121,71,.30)',
        fontSize:12.5, color:'#A8421F', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12,
      }}>
        <span>{error}</span>
        <button onClick={() => generate()} style={{padding:'5px 10px',borderRadius:8,background:'#000',color:'#fff',fontSize:11.5,fontWeight:600,border:0,cursor:'pointer'}}>Try again</button>
      </div>
    )}

    {/* Prompt to add a brief if we can't generate yet */}
    {!hasBrief && !names.length && (
      <div style={{padding:'40px 20px', textAlign:'center', color:'var(--fg-3)', fontSize:13.5}}>
        Add a brief in Step 1 and Fluid will draft names here.
      </div>
    )}

    {/* Loading skeletons on the first generation */}
    {loading && !names.length && (
      <div style={{display:'grid', gridTemplateColumns:NAME_GRID, gap:10}}>
        {Array.from({length:18}).map((_, i) => (
          <div key={i} style={{
            background:'var(--bg-elev)', borderRadius:12, minHeight:58,
            boxShadow:'var(--shadow-xs), inset 0 0 0 1px var(--line)',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>{i === 4 ? <Thinking/> : null}</div>
        ))}
      </div>
    )}

    {/* Name grid */}
    {names.length > 0 && (
      <div style={{display:'grid', gridTemplateColumns:NAME_GRID, gap:10, opacity: loading ? 0.5 : 1}}>
        {names.map((o) => (
          <ANameCard key={o.name} n={o.name}
            sel={chosen === o.name} liked={liked.includes(o.name)}
            onClick={() => chooseName(o.name)} onLike={() => toggleLike(o.name)} />
        ))}
      </div>
    )}
  </AWizardLayout>
  );
};

// =====================================================================
// A5 · Step 4 · Logo Concept Selection Screen
// Four logo concepts as large cards. Each card shows the primary
// mark in a generous canvas, three variations underneath (different
// scales/contexts), the concept name, and a designer-style note.
// Selected card gets the accent ring; the right panel shows refine
// controls for the chosen concept.
// =====================================================================
const ALogoMark = ({ shape, size = 88 }) => {
  if (shape === 'ribbon') {
    return (
      <div style={{position:'relative', width:size, height:size*0.6}}>
        <svg viewBox="0 0 120 70" width={size} height={size*0.58} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="rg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#44D9C7"/>
              <stop offset="0.55" stopColor="#FDBA50"/>
              <stop offset="1" stopColor="#FD7947"/>
            </linearGradient>
          </defs>
          <path d="M5 38 C 25 8, 55 8, 75 32 C 90 50, 110 50, 115 30" stroke="url(#rg)" strokeWidth="14" fill="none" strokeLinecap="round"/>
        </svg>
      </div>
    );
  }
  if (shape === 'monogram') {
    return (
      <div style={{
        width:size, height:size, borderRadius: size*0.18,
        background:'#000', color:'#fff',
        display:'inline-flex',alignItems:'center',justifyContent:'center',
        fontFamily:'var(--font-display)', fontWeight:900,
        fontSize: size*0.52, letterSpacing:'-0.06em',
      }}>C<span style={{color:'#FD7947'}}>.</span></div>
    );
  }
  if (shape === 'wordmark') {
    return (
      <div style={{
        fontFamily:'var(--font-display)', fontWeight:800,
        fontSize: size*0.42, letterSpacing:'-0.04em', color:'#000',
        lineHeight: 1, padding:'0 4px',
      }}>cadence<span style={{color:'#FD7947'}}>.</span></div>
    );
  }
  if (shape === 'circle') {
    return (
      <div style={{position:'relative', width:size, height:size}}>
        <div style={{position:'absolute',inset:0,borderRadius:'50%',border: `${Math.max(2,size*0.04)}px solid #000`}}/>
        <div style={{position:'absolute', top:'50%', left:'50%', width: size*0.22, height: size*0.22, borderRadius:'50%', background:'#FD7947', transform:'translate(-50%,-50%)'}}/>
        <div style={{position:'absolute', top: size*0.10, left:'50%', width: 1.5, height: size*0.40, background:'#000', transform:'translateX(-50%)'}}/>
      </div>
    );
  }
  return null;
};

const ALogoConceptCard = ({ n, name, descriptor, shape, sel, status, onClick }) => {
  return (
    <div onClick={onClick} style={{
      background:'var(--bg-elev)', borderRadius: 18, padding: 16,
      boxShadow: sel ? '0 0 0 2px #000, var(--shadow-sm)' : 'var(--shadow-xs), inset 0 0 0 1px var(--line)',
      display:'flex', flexDirection:'column', gap:12, cursor:'pointer',
      position:'relative',
    }}>
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
        <span style={{fontSize:10.5, color:'var(--fg-3)', fontFamily:'var(--font-mono)', letterSpacing:'0.06em'}}>0{n} · CONCEPT</span>
        {status === 'streaming' && <span style={{display:'inline-flex',alignItems:'center',gap:5,fontSize:10,fontWeight:600,color:'#0E6B5E'}}>
          <span style={{width:5,height:5,borderRadius:99,background:'#44D9C7',boxShadow:'0 0 4px #44D9C7'}}/> drafting
        </span>}
        {sel && <span style={{display:'inline-flex',alignItems:'center',gap:5,fontSize:10,fontWeight:700,color:'#fff',background:'#000',padding:'3px 8px',borderRadius:99,letterSpacing:'0.04em'}}>SELECTED</span>}
      </div>
      {/* Hero mark */}
      <div style={{
        background: 'var(--bg)', borderRadius: 12,
        height: 132,
        display:'flex', alignItems:'center', justifyContent:'center',
        boxShadow:'inset 0 0 0 1px var(--line)',
      }}>
        {status === 'streaming' ? <Thinking/> : <ALogoMark shape={shape}/>}
      </div>
      {/* 3 variations */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:6, opacity: status === 'streaming' ? 0.4 : 1}}>
        <div style={{height:48, background:'#0F1115', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center'}}>
          {shape === 'ribbon' && <ALogoMark shape="ribbon" size={36}/>}
          {shape === 'monogram' && <div style={{width:24,height:24,borderRadius:5,background:'#FD7947',color:'#000',display:'inline-flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--font-display)',fontWeight:900,fontSize:14}}>C</div>}
          {shape === 'wordmark' && <div style={{fontFamily:'var(--font-display)', fontWeight:800, fontSize:14, color:'#fff', letterSpacing:'-0.04em'}}>cadence<span style={{color:'#FD7947'}}>.</span></div>}
          {shape === 'circle' && <div style={{width:24,height:24,borderRadius:99,border:'1.5px solid #fff',position:'relative'}}><div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',width:6,height:6,borderRadius:99,background:'#FD7947'}}/></div>}
        </div>
        <div style={{height:48, background:'var(--bg)', borderRadius:8, boxShadow:'inset 0 0 0 1px var(--line)', display:'flex', alignItems:'center', justifyContent:'center', gap:6}}>
          {shape === 'ribbon' && <ALogoMark shape="ribbon" size={28}/>}
          {shape === 'monogram' && <div style={{width:18,height:18,borderRadius:4,background:'#000',color:'#fff',display:'inline-flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--font-display)',fontWeight:900,fontSize:11}}>C</div>}
          {shape === 'wordmark' && <div style={{fontFamily:'var(--font-display)', fontWeight:800, fontSize:13, color:'#000', letterSpacing:'-0.04em'}}>cadence<span style={{color:'#FD7947'}}>.</span></div>}
          {shape === 'circle' && <ALogoMark shape="circle" size={24}/>}
          <span style={{fontFamily:'var(--font-display)', fontSize:12, fontWeight:700, color:'var(--fg-1)', letterSpacing:'-0.02em'}}>cadence</span>
        </div>
        <div style={{height:48, background:'var(--bg-sunken)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', position:'relative'}}>
          <div style={{
            width:18, height:18, borderRadius:4, background:'#fff',
            boxShadow:'0 1px 4px rgba(0,0,0,.18)',
            display:'inline-flex',alignItems:'center',justifyContent:'center',
          }}>
            {shape === 'ribbon' && <div style={{width:10,height:5,borderRadius:99,background:'linear-gradient(135deg,#44D9C7,#FD7947)'}}/>}
            {shape === 'monogram' && <span style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:9,letterSpacing:'-0.04em'}}>C</span>}
            {shape === 'wordmark' && <span style={{fontFamily:'var(--font-display)',fontWeight:900,fontSize:9,letterSpacing:'-0.04em'}}>c<span style={{color:'#FD7947'}}>.</span></span>}
            {shape === 'circle' && <div style={{width:8,height:8,borderRadius:99,border:'1px solid #000'}}/>}
          </div>
        </div>
      </div>
      <div>
        <div style={{fontFamily:'var(--font-display)', fontWeight:700, fontSize:14, letterSpacing:'-0.018em', color:'#000'}}>{name}</div>
        <div style={{fontSize:11.5, color:'var(--fg-3)', lineHeight:1.4, marginTop:2}}>{descriptor}</div>
      </div>
    </div>
  );
};

const LOGO_CONCEPTS = [
  { n:1, name:'Ribbon mark', descriptor:"A single fluid line — cadence as movement. Best at large scale; works mono and gradient.", shape:'ribbon' },
  { n:2, name:'Monogram', descriptor:"Confident, square. The dot signals the period — a beat. Strongest at app-icon scale.", shape:'monogram' },
  { n:3, name:'Wordmark', descriptor:"The full name. The full stop carries the cadence — quiet, decisive. Editorial-leaning.", shape:'wordmark' },
  { n:4, name:'Sundial', descriptor:"A circle with a marker — time, ritual, return. Slowest to read; best as small mnemonic.", shape:'circle' },
];

const DirA_Step4_Logo = () => {
  const { draft, setField } = useBrandDraft();
  const chosen = (draft && draft.logo_choice) || null;
  return (
  <AWizardLayout
    step={4}
    title="Pick a logo direction."
    subtitle="Four concepts, each with primary mark and three application contexts. Refine after."
    status="Draft"
    progress="Step 4 of 5"
    nextLabel="Assemble Brand Kit"
    onNext={() => {}}
    isThinking={false}
  >
    <div style={{display:'grid', gridTemplateColumns:'2.4fr 1fr', gap:18, alignItems:'start'}}>
      {/* 4 concept cards in a 2 × 2 grid */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:14}}>
        {LOGO_CONCEPTS.map((c) => (
          <ALogoConceptCard key={c.n} n={c.n} name={c.name} descriptor={c.descriptor} shape={c.shape}
            status={c.status} sel={chosen === c.name} onClick={() => setField('logo_choice', c.name)} />
        ))}
      </div>

      {/* Refinement panel for selected concept */}
      <div style={{
        background:'var(--bg-elev)', borderRadius: 18,
        boxShadow:'var(--shadow-sm), inset 0 0 0 1px var(--line)',
        padding: 20, display:'flex', flexDirection:'column', gap: 16,
      }}>
        <div>
          <div className="eyebrow" style={{color:'var(--fg-3)', fontSize:10, marginBottom:6}}>Refining · 01 Ribbon mark</div>
          <h3 style={{fontFamily:'var(--font-display)', fontWeight:700, fontSize:16, margin:0, color:'#000', letterSpacing:'-0.018em'}}>Tune the chosen mark</h3>
        </div>

        {/* Color treatment */}
        <div>
          <div style={{fontSize:11, fontWeight:600, color:'var(--fg-3)', marginBottom:8, letterSpacing:'0.06em', textTransform:'uppercase'}}>Color treatment</div>
          <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:6}}>
            {[
              {sel:true, bg:'linear-gradient(135deg,#44D9C7,#FDBA50,#FD7947)', label:'Gradient'},
              {sel:false, bg:'#FD7947', label:'Coral'},
              {sel:false, bg:'#000', label:'Mono'},
            ].map((s,i)=>(
              <div key={i} style={{
                borderRadius:10, padding:8, display:'flex', flexDirection:'column', alignItems:'center', gap:6,
                background: s.sel ? 'var(--bg-sunken)' : 'transparent',
                boxShadow: s.sel ? 'inset 0 0 0 1.5px #000' : 'inset 0 0 0 1px var(--line)',
                cursor:'pointer',
              }}>
                <div style={{width:28, height:14, borderRadius:99, background:s.bg}}/>
                <span style={{fontSize:10.5, fontWeight:600, color:'var(--fg-2)'}}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        <ASlider left="Tight" right="Generous" value={64} />
        <ASlider left="Geometric" right="Organic" value={48} />

        {/* Lockup options */}
        <div>
          <div style={{fontSize:11, fontWeight:600, color:'var(--fg-3)', marginBottom:8, letterSpacing:'0.06em', textTransform:'uppercase'}}>Lockup</div>
          <div style={{display:'flex', flexDirection:'column', gap:6}}>
            {[
              {sel:true, label:'Mark only'},
              {sel:false, label:'Mark + wordmark · horizontal'},
              {sel:false, label:'Mark + wordmark · stacked'},
            ].map((s,i)=>(
              <div key={i} style={{
                padding:'8px 10px', borderRadius:8,
                background: s.sel ? 'var(--bg-sunken)' : 'transparent',
                boxShadow: s.sel ? 'inset 0 0 0 1.5px #000' : 'inset 0 0 0 1px var(--line)',
                fontSize:12, fontWeight:600, color:'var(--fg-1)',
                display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer',
              }}>
                {s.label}
                {s.sel && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
              </div>
            ))}
          </div>
        </div>

        <button style={{
          marginTop:'auto', padding:'10px 14px', borderRadius:10,
          background:'transparent', color:'var(--fg-2)', fontSize:12, fontWeight:600,
          boxShadow:'inset 0 0 0 1px var(--line)', display:'inline-flex', alignItems:'center', justifyContent:'center', gap:6,
          border:0, cursor:'pointer',
        }}>
          <Sparkle size={11}/> Draft 4 more concepts
        </button>
      </div>
    </div>
  </AWizardLayout>
  );
};

// =====================================================================
// A5 · Step 5 · Brand Kit Screen (Finalized)
// Logo, palette, typography, and guidelines are all AI-generated below.
// =====================================================================

// A single generated color swatch — block + name / hex / usage.
const KitSwatch = ({ c }) => (
  <div style={{ flex: '1 1 140px', minWidth: 120, display: 'flex', flexDirection: 'column', gap: 8 }}>
    <div style={{ height: 76, borderRadius: 12, background: c.hex, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.08)' }} />
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13.5, color: '#000', letterSpacing: '-0.01em' }}>{c.name}</div>
        <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--fg-3)', textTransform: 'uppercase' }}>{c.hex}</div>
      </div>
      <div style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 2 }}>{c.role}</div>
      {c.usage && <div style={{ fontSize: 11, color: 'var(--fg-4)', marginTop: 1, lineHeight: 1.35 }}>{c.usage}</div>}
    </div>
  </div>
);

// Full-width palette section for the Brand Kit. Auto-generates on open when a
// brief exists and no palette is cached yet; supports regenerate + retry.
const KitPaletteSection = ({ draft }) => {
  const brandId = draft && draft.id;
  const hasBrief = !!(draft && String(draft.brief || '').trim());
  const cached = (draft && draft.data && draft.data.palette) || null;
  const [palette, setPalette] = React.useState(cached);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const requestedFor = React.useRef(null);

  const generate = React.useCallback(async () => {
    if (!brandId) return;
    setLoading(true); setError('');
    const res = await apiGeneratePalette(brandId);
    if (res.error) setError(res.error);
    else setPalette(res.palette);
    setLoading(false);
  }, [brandId]);

  React.useEffect(() => {
    if (!brandId || !hasBrief || palette) return;
    if (requestedFor.current === brandId) return;
    requestedFor.current = brandId;
    generate();
  }, [brandId, hasBrief, palette, generate]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div className="eyebrow" style={{ color: 'var(--fg-3)' }}>Color palette</div>
        <button onClick={() => !loading && generate()} disabled={loading || !brandId} style={{
          padding: '6px 11px', borderRadius: 8, background: 'transparent', color: 'var(--fg-2)',
          fontSize: 11.5, fontWeight: 600, boxShadow: 'inset 0 0 0 1px var(--line)',
          display: 'inline-flex', alignItems: 'center', gap: 6, border: 0,
          cursor: loading ? 'default' : 'pointer', opacity: loading || !brandId ? 0.6 : 1,
        }}>
          <Sparkle size={11} /> {palette ? 'Regenerate' : 'Generate'}
        </button>
      </div>

      <div style={{ background: 'var(--bg-elev)', borderRadius: 18, boxShadow: 'inset 0 0 0 1px var(--line)', padding: 22 }}>
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, fontSize: 12.5, color: '#A8421F' }}>
            <span>{error}</span>
            <button onClick={() => generate()} style={{ padding: '5px 10px', borderRadius: 8, background: '#000', color: '#fff', fontSize: 11.5, fontWeight: 600, border: 0, cursor: 'pointer' }}>Try again</button>
          </div>
        )}

        {!error && !palette && !hasBrief && (
          <div style={{ fontSize: 13, color: 'var(--fg-3)' }}>Add a brief and Fluid will design a palette here.</div>
        )}

        {!error && !palette && hasBrief && (
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ flex: '1 1 140px', minWidth: 120 }}>
                <div style={{ height: 76, borderRadius: 12, background: 'var(--bg-sunken)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{loading && i === 2 ? <Thinking /> : null}</div>
              </div>
            ))}
          </div>
        )}

        {palette && (
          <>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', opacity: loading ? 0.5 : 1 }}>
              {palette.colors.map((c, i) => <KitSwatch key={c.hex + i} c={c} />)}
            </div>
            {palette.rationale && (
              <p style={{ fontSize: 12.5, color: 'var(--fg-3)', lineHeight: 1.5, margin: '16px 0 0', maxWidth: 640 }}>{palette.rationale}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// Full-width typography section for the Brand Kit. Recommends a Google-Fonts
// heading + body pairing and renders a live specimen. Auto-generates on open.
const KitTypographySection = ({ draft }) => {
  const brandId = draft && draft.id;
  const hasBrief = !!(draft && String(draft.brief || '').trim());
  const cached = (draft && draft.data && draft.data.typography) || null;
  const [type, setType] = React.useState(cached);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const requestedFor = React.useRef(null);

  // Load the web fonts whenever we have a pairing to show.
  React.useEffect(() => {
    if (type) { ensureGoogleFont(type.heading.family); ensureGoogleFont(type.body.family); }
  }, [type]);

  const generate = React.useCallback(async () => {
    if (!brandId) return;
    setLoading(true); setError('');
    const res = await apiGenerateTypography(brandId);
    if (res.error) setError(res.error);
    else setType(res.typography);
    setLoading(false);
  }, [brandId]);

  React.useEffect(() => {
    if (!brandId || !hasBrief || type) return;
    if (requestedFor.current === brandId) return;
    requestedFor.current = brandId;
    generate();
  }, [brandId, hasBrief, type, generate]);

  const brandName = (draft && (draft.name_choice || draft.name)) || 'Your brand';
  const ff = (face) => '"' + face.family + '", ' + (FONT_FALLBACK[face.category] || 'sans-serif');

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div className="eyebrow" style={{ color: 'var(--fg-3)' }}>Typography</div>
        <button onClick={() => !loading && generate()} disabled={loading || !brandId} style={{
          padding: '6px 11px', borderRadius: 8, background: 'transparent', color: 'var(--fg-2)',
          fontSize: 11.5, fontWeight: 600, boxShadow: 'inset 0 0 0 1px var(--line)',
          display: 'inline-flex', alignItems: 'center', gap: 6, border: 0,
          cursor: loading ? 'default' : 'pointer', opacity: loading || !brandId ? 0.6 : 1,
        }}>
          <Sparkle size={11} /> {type ? 'Regenerate' : 'Generate'}
        </button>
      </div>

      <div style={{ background: 'var(--bg-elev)', borderRadius: 18, boxShadow: 'inset 0 0 0 1px var(--line)', padding: 22 }}>
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, fontSize: 12.5, color: '#A8421F' }}>
            <span>{error}</span>
            <button onClick={() => generate()} style={{ padding: '5px 10px', borderRadius: 8, background: '#000', color: '#fff', fontSize: 11.5, fontWeight: 600, border: 0, cursor: 'pointer' }}>Try again</button>
          </div>
        )}

        {!error && !type && !hasBrief && (
          <div style={{ fontSize: 13, color: 'var(--fg-3)' }}>Add a brief and Fluid will recommend a type system here.</div>
        )}

        {!error && !type && hasBrief && (
          <div style={{ minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{loading ? <Thinking /> : null}</div>
        )}

        {type && (
          <div style={{ opacity: loading ? 0.5 : 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Heading specimen */}
            <div>
              <div style={{ fontSize: 10.5, fontFamily: 'var(--font-mono)', color: 'var(--fg-3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
                Display · {type.heading.family}{type.heading.weights ? ' · ' + type.heading.weights : ''}
              </div>
              <div style={{ fontFamily: ff(type.heading), fontWeight: 700, fontSize: 40, lineHeight: 1.05, color: '#000', letterSpacing: '-0.02em' }}>{brandName}</div>
              <div style={{ fontFamily: ff(type.heading), fontWeight: 600, fontSize: 20, color: 'var(--fg-1)', marginTop: 6 }}>The quick brown fox jumps over the lazy dog</div>
              {type.heading.usage && <div style={{ fontSize: 11.5, color: 'var(--fg-3)', marginTop: 6 }}>{type.heading.usage}</div>}
            </div>
            {/* Body specimen */}
            <div style={{ borderTop: '1px solid var(--line)', paddingTop: 18 }}>
              <div style={{ fontSize: 10.5, fontFamily: 'var(--font-mono)', color: 'var(--fg-3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
                Body · {type.body.family}{type.body.weights ? ' · ' + type.body.weights : ''}
              </div>
              <p style={{ fontFamily: ff(type.body), fontSize: 15, lineHeight: 1.6, color: 'var(--fg-1)', margin: 0, maxWidth: 620 }}>
                {brandName} helps people move with intention. Every detail is considered, every interaction quiet and deliberate — the kind of product you reach for without thinking. 0123456789
              </p>
              {type.body.usage && <div style={{ fontSize: 11.5, color: 'var(--fg-3)', marginTop: 6 }}>{type.body.usage}</div>}
            </div>
            {type.rationale && (
              <p style={{ fontSize: 12.5, color: 'var(--fg-3)', lineHeight: 1.5, margin: 0, maxWidth: 640 }}>{type.rationale}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Full-width logo section for the Brand Kit. Generates SVG mark concepts and
// lets the user pick one (saved to logo_choice). Auto-generates on open.
const KitLogoSection = ({ draft }) => {
  const { setField } = useBrandDraft();
  const brandId = draft && draft.id;
  const hasBrief = !!(draft && String(draft.brief || '').trim());
  const cached = (draft && draft.data && draft.data.logos) || [];
  const chosen = (draft && draft.logo_choice) || null;
  const [logos, setLogos] = React.useState(cached);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const requestedFor = React.useRef(null);

  const generate = React.useCallback(async () => {
    if (!brandId) return;
    setLoading(true); setError('');
    const res = await apiGenerateLogos(brandId);
    if (res.error) setError(res.error);
    else setLogos(res.logos);
    setLoading(false);
  }, [brandId]);

  React.useEffect(() => {
    if (!brandId || !hasBrief || logos.length) return;
    if (requestedFor.current === brandId) return;
    requestedFor.current = brandId;
    generate();
  }, [brandId, hasBrief, logos.length, generate]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div className="eyebrow" style={{ color: 'var(--fg-3)' }}>Logo</div>
        <button onClick={() => !loading && generate()} disabled={loading || !brandId} style={{
          padding: '6px 11px', borderRadius: 8, background: 'transparent', color: 'var(--fg-2)',
          fontSize: 11.5, fontWeight: 600, boxShadow: 'inset 0 0 0 1px var(--line)',
          display: 'inline-flex', alignItems: 'center', gap: 6, border: 0,
          cursor: loading ? 'default' : 'pointer', opacity: loading || !brandId ? 0.6 : 1,
        }}>
          <Sparkle size={11} /> {logos.length ? 'Regenerate' : 'Generate'}
        </button>
      </div>

      {error && (
        <div style={{ marginBottom: 14, padding: '12px 14px', borderRadius: 12, background: 'rgba(253,121,71,.10)', boxShadow: 'inset 0 0 0 1px rgba(253,121,71,.30)', fontSize: 12.5, color: '#A8421F', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span>{error}</span>
          <button onClick={() => generate()} style={{ padding: '5px 10px', borderRadius: 8, background: '#000', color: '#fff', fontSize: 11.5, fontWeight: 600, border: 0, cursor: 'pointer' }}>Try again</button>
        </div>
      )}

      {!error && !logos.length && !hasBrief && (
        <div style={{ background: 'var(--bg-elev)', borderRadius: 18, boxShadow: 'inset 0 0 0 1px var(--line)', padding: 22, fontSize: 13, color: 'var(--fg-3)' }}>Add a brief and Fluid will design logo marks here.</div>
      )}

      {!error && !logos.length && hasBrief && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ background: 'var(--bg-elev)', borderRadius: 16, boxShadow: 'inset 0 0 0 1px var(--line)', minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{loading && i === 1 ? <Thinking /> : null}</div>
          ))}
        </div>
      )}

      {logos.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, opacity: loading ? 0.5 : 1 }}>
          {logos.map((c) => {
            const sel = chosen === c.name;
            return (
              <div key={c.name} onClick={() => setField && setField('logo_choice', c.name)} style={{
                background: 'var(--bg-elev)', borderRadius: 16, padding: 16, cursor: 'pointer',
                boxShadow: sel ? '0 0 0 2px #000, var(--shadow-sm)' : 'var(--shadow-xs), inset 0 0 0 1px var(--line)',
                display: 'flex', flexDirection: 'column', gap: 12,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 10.5, color: 'var(--fg-3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Concept</span>
                  {sel && <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: '#000', padding: '3px 8px', borderRadius: 99, letterSpacing: '0.04em' }}>SELECTED</span>}
                </div>
                <div style={{ background: '#fff', borderRadius: 12, height: 148, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 0 0 1px var(--line)' }}>
                  <SvgMark svg={c.svg} size={120} />
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: '#000', letterSpacing: '-0.018em' }}>{c.name}</div>
                  {c.descriptor && <div style={{ fontSize: 11.5, color: 'var(--fg-3)', lineHeight: 1.4, marginTop: 2 }}>{c.descriptor}</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// A labelled block within the guidelines document.
const GuideBlock = ({ label, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    <div style={{ fontSize: 10.5, fontFamily: 'var(--font-mono)', color: 'var(--fg-3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</div>
    {children}
  </div>
);

// Full-width brand-guidelines section — the capstone. Synthesizes a written
// guide from the brief and the generated assets. Generated on explicit click so
// it reads the palette / type / logo after they've been cached.
const KitGuidelinesSection = ({ draft }) => {
  const brandId = draft && draft.id;
  const hasBrief = !!(draft && String(draft.brief || '').trim());
  const cached = (draft && draft.data && draft.data.guidelines) || null;
  const [g, setG] = React.useState(cached);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const generate = React.useCallback(async () => {
    if (!brandId) return;
    setLoading(true); setError('');
    const res = await apiGenerateGuidelines(brandId);
    if (res.error) setError(res.error);
    else setG(res.guidelines);
    setLoading(false);
  }, [brandId]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div className="eyebrow" style={{ color: 'var(--fg-3)' }}>Brand guidelines</div>
        {(g || hasBrief) && (
          <button onClick={() => !loading && generate()} disabled={loading || !brandId} style={{
            padding: '6px 11px', borderRadius: 8, background: g ? 'transparent' : '#000', color: g ? 'var(--fg-2)' : '#fff',
            fontSize: 11.5, fontWeight: 600, boxShadow: g ? 'inset 0 0 0 1px var(--line)' : 'none',
            display: 'inline-flex', alignItems: 'center', gap: 6, border: 0,
            cursor: loading ? 'default' : 'pointer', opacity: loading || !brandId ? 0.6 : 1,
          }}>
            <Sparkle size={11} color={g ? undefined : '#fff'} /> {loading ? 'Writing…' : g ? 'Regenerate' : 'Generate guide'}
          </button>
        )}
      </div>

      <div style={{ background: 'var(--bg-elev)', borderRadius: 18, boxShadow: 'inset 0 0 0 1px var(--line)', padding: 24 }}>
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, fontSize: 12.5, color: '#A8421F', marginBottom: g ? 16 : 0 }}>
            <span>{error}</span>
            <button onClick={() => generate()} style={{ padding: '5px 10px', borderRadius: 8, background: '#000', color: '#fff', fontSize: 11.5, fontWeight: 600, border: 0, cursor: 'pointer' }}>Try again</button>
          </div>
        )}

        {!g && !error && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
            {loading ? <Thinking /> : (
              <div style={{ fontSize: 13, color: 'var(--fg-3)', lineHeight: 1.5 }}>
                {hasBrief
                  ? 'Assemble a written brand guide — positioning, voice, messaging, and usage — from your brief and the assets above.'
                  : 'Add a brief and Fluid will write your brand guide here.'}
              </div>
            )}
          </div>
        )}

        {g && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, opacity: loading ? 0.5 : 1 }}>
            {g.positioning && (
              <GuideBlock label="Positioning">
                <p style={{ fontSize: 15, lineHeight: 1.6, color: '#000', margin: 0, maxWidth: 660 }}>{g.positioning}</p>
              </GuideBlock>
            )}

            {g.messaging && g.messaging.tagline && (
              <GuideBlock label="Tagline">
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: '#000', letterSpacing: '-0.02em' }}>{g.messaging.tagline}</div>
              </GuideBlock>
            )}

            {g.voice && (g.voice.traits.length > 0 || g.voice.description) && (
              <GuideBlock label="Voice & tone">
                {g.voice.traits.length > 0 && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                    {g.voice.traits.map((t) => (
                      <span key={t} style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-1)', padding: '4px 10px', borderRadius: 99, boxShadow: 'inset 0 0 0 1px var(--line)' }}>{t}</span>
                    ))}
                  </div>
                )}
                {g.voice.description && <p style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--fg-1)', margin: 0, maxWidth: 660 }}>{g.voice.description}</p>}
              </GuideBlock>
            )}

            {g.messaging && g.messaging.pillars && g.messaging.pillars.length > 0 && (
              <GuideBlock label="Key messages">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  {g.messaging.pillars.map((p, i) => (
                    <div key={i} style={{ background: 'var(--bg)', borderRadius: 12, padding: 14, boxShadow: 'inset 0 0 0 1px var(--line)' }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13.5, color: '#000', marginBottom: 4 }}>{p.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--fg-2)', lineHeight: 1.45 }}>{p.body}</div>
                    </div>
                  ))}
                </div>
              </GuideBlock>
            )}

            {(g.dos.length > 0 || g.donts.length > 0) && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                <GuideBlock label="Do">
                  <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {g.dos.map((d, i) => (
                      <li key={i} style={{ fontSize: 13, color: 'var(--fg-1)', lineHeight: 1.45, display: 'flex', gap: 8 }}>
                        <span style={{ color: '#0E6B5E', fontWeight: 700 }}>✓</span> {d}
                      </li>
                    ))}
                  </ul>
                </GuideBlock>
                <GuideBlock label="Don't">
                  <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {g.donts.map((d, i) => (
                      <li key={i} style={{ fontSize: 13, color: 'var(--fg-1)', lineHeight: 1.45, display: 'flex', gap: 8 }}>
                        <span style={{ color: '#A8421F', fontWeight: 700 }}>✕</span> {d}
                      </li>
                    ))}
                  </ul>
                </GuideBlock>
              </div>
            )}

            {g.usage && (g.usage.logo || g.usage.color || g.usage.type) && (
              <GuideBlock label="Asset usage">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {g.usage.logo && <div style={{ fontSize: 13, color: 'var(--fg-1)', lineHeight: 1.5 }}><b style={{ color: '#000' }}>Logo — </b>{g.usage.logo}</div>}
                  {g.usage.color && <div style={{ fontSize: 13, color: 'var(--fg-1)', lineHeight: 1.5 }}><b style={{ color: '#000' }}>Color — </b>{g.usage.color}</div>}
                  {g.usage.type && <div style={{ fontSize: 13, color: 'var(--fg-1)', lineHeight: 1.5 }}><b style={{ color: '#000' }}>Type — </b>{g.usage.type}</div>}
                </div>
              </GuideBlock>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════
// Brand-kit export — all client-side, no dependencies. Downloads the logo
// (SVG/PNG), the palette as CSS variables, and a self-contained brand-sheet
// HTML file that gathers everything (printable to PDF).
// ══════════════════════════════════════════════════════════════════════
function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
function kitSlug(s) {
  return String(s || 'brand').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'brand';
}
function escHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
}
// The user's chosen logo concept's SVG (or the first available).
function pickLogoSvg(b) {
  const logos = (b.data && b.data.logos) || [];
  if (!logos.length) return null;
  const pick = logos.find((l) => l.name === b.logo_choice) || logos[0];
  return pick ? pick.svg : null;
}
// Rasterize an SVG string to a PNG Blob at `size`px via an offscreen canvas.
function svgToPngBlob(svg, size) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('PNG export failed'))), 'image/png');
    };
    img.onerror = () => reject(new Error('Could not load the logo for PNG export'));
    img.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  });
}
function buildPaletteCss(b) {
  const colors = ((b.data && b.data.palette && b.data.palette.colors) || []);
  let css = '/* ' + (b.name_choice || b.name || 'Brand') + ' — color palette */\n:root {\n';
  colors.forEach((c, i) => {
    const key = kitSlug(c.name) || ('color-' + (i + 1));
    css += '  --brand-' + key + ': ' + c.hex + ';' + (c.role ? '  /* ' + c.role + ' */' : '') + '\n';
  });
  css += '}\n';
  return css;
}
function googleFontsHref(families) {
  const uniq = Array.from(new Set(families.filter(Boolean)));
  if (!uniq.length) return '';
  return 'https://fonts.googleapis.com/css2?' +
    uniq.map((f) => 'family=' + encodeURIComponent(f).replace(/%20/g, '+')).join('&') + '&display=swap';
}
// Compose a single self-contained HTML brand sheet from everything generated.
function buildBrandSheetHtml(b) {
  const data = b.data || {};
  const name = b.name_choice || b.name || 'Your brand';
  const pal = data.palette || {};
  const colors = pal.colors || [];
  const type = data.typography || null;
  const g = data.guidelines || null;
  const logoSvg = pickLogoSvg(b);
  const headFam = type && type.heading && type.heading.family;
  const bodyFam = type && type.body && type.body.family;
  const fontsHref = googleFontsHref([headFam, bodyFam]);
  const ff = (fam, fallback) => fam ? ('"' + fam + '", ' + fallback) : fallback;

  const sec = (title, inner) => inner
    ? '<section><h2>' + escHtml(title) + '</h2>' + inner + '</section>' : '';

  const briefRows = [
    ['Brief', b.brief], ['Audience', b.audience], ['Logo direction', b.logo_choice],
  ].filter((r) => r[1]).map((r) => '<div class="row"><span>' + escHtml(r[0]) + '</span><p>' + escHtml(r[1]) + '</p></div>').join('');

  const paletteHtml = colors.length ? '<div class="swatches">' + colors.map((c) =>
    '<div class="sw"><div class="chip" style="background:' + escHtml(c.hex) + '"></div>' +
    '<b>' + escHtml(c.name) + '</b><code>' + escHtml((c.hex || '').toUpperCase()) + '</code>' +
    '<em>' + escHtml(c.role) + '</em>' + (c.usage ? '<span>' + escHtml(c.usage) + '</span>' : '') + '</div>').join('') +
    '</div>' + (pal.rationale ? '<p class="note">' + escHtml(pal.rationale) + '</p>' : '') : '';

  const typeHtml = type ? (
    '<div class="type"><div class="eyebrow">Display · ' + escHtml(headFam) + (type.heading.weights ? ' · ' + escHtml(type.heading.weights) : '') + '</div>' +
    '<div class="display" style="font-family:' + ff(headFam, 'serif') + '">' + escHtml(name) + '</div>' +
    '<div class="eyebrow">Body · ' + escHtml(bodyFam) + (type.body.weights ? ' · ' + escHtml(type.body.weights) : '') + '</div>' +
    '<p class="body" style="font-family:' + ff(bodyFam, 'sans-serif') + '">The quick brown fox jumps over the lazy dog. 0123456789</p>' +
    (type.rationale ? '<p class="note">' + escHtml(type.rationale) + '</p>' : '') + '</div>'
  ) : '';

  const guidelinesHtml = g ? (
    (g.positioning ? '<h3>Positioning</h3><p>' + escHtml(g.positioning) + '</p>' : '') +
    (g.messaging && g.messaging.tagline ? '<h3>Tagline</h3><p class="tag">' + escHtml(g.messaging.tagline) + '</p>' : '') +
    (g.voice && (g.voice.traits || []).length ? '<h3>Voice &amp; tone</h3><p>' + (g.voice.traits || []).map(escHtml).join(' · ') + '</p>' + (g.voice.description ? '<p>' + escHtml(g.voice.description) + '</p>' : '') : '') +
    (g.messaging && (g.messaging.pillars || []).length ? '<h3>Key messages</h3><ul>' + g.messaging.pillars.map((p) => '<li><b>' + escHtml(p.title) + '</b> — ' + escHtml(p.body) + '</li>').join('') + '</ul>' : '') +
    ((g.dos || []).length ? '<h3>Do</h3><ul>' + g.dos.map((d) => '<li>' + escHtml(d) + '</li>').join('') + '</ul>' : '') +
    ((g.donts || []).length ? '<h3>Don’t</h3><ul>' + g.donts.map((d) => '<li>' + escHtml(d) + '</li>').join('') + '</ul>' : '') +
    (g.usage ? '<h3>Asset usage</h3>' + ['logo', 'color', 'type'].filter((k) => g.usage[k]).map((k) => '<p><b>' + k[0].toUpperCase() + k.slice(1) + '</b> — ' + escHtml(g.usage[k]) + '</p>').join('') : '')
  ) : '';

  return '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>' + escHtml(name) + ' — Brand kit</title>' +
    (fontsHref ? '<link rel="stylesheet" href="' + escHtml(fontsHref) + '">' : '') +
    '<style>' +
    ':root{color-scheme:light}*{box-sizing:border-box}body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#141414;background:#fff;line-height:1.5}' +
    '.wrap{max-width:820px;margin:0 auto;padding:64px 32px}' +
    'header{border-bottom:1px solid #eee;padding-bottom:28px;margin-bottom:40px}' +
    'h1{font-size:44px;letter-spacing:-.03em;margin:0}.sub{color:#888;font-size:13px;text-transform:uppercase;letter-spacing:.12em;margin-bottom:14px}' +
    'section{margin:40px 0}h2{font-size:12px;text-transform:uppercase;letter-spacing:.1em;color:#999;margin:0 0 16px}' +
    'h3{font-size:14px;margin:22px 0 6px}p{margin:0 0 10px}.note{color:#777;font-size:13px}' +
    '.row{display:flex;gap:16px;margin:8px 0}.row span{flex:0 0 130px;color:#999;font-size:13px}.row p{margin:0}' +
    '.logo{border:1px solid #eee;border-radius:16px;padding:40px;display:flex;justify-content:center;background:#fff}' +
    '.swatches{display:flex;flex-wrap:wrap;gap:16px}.sw{width:130px}.sw .chip{height:72px;border-radius:10px;box-shadow:inset 0 0 0 1px rgba(0,0,0,.08)}' +
    '.sw b{display:block;font-size:13px;margin-top:8px}.sw code{display:block;font-size:11px;color:#888}.sw em{display:block;font-size:11px;color:#aaa;font-style:normal}.sw span{display:block;font-size:11px;color:#aaa}' +
    '.display{font-size:52px;letter-spacing:-.02em;margin:6px 0 20px}.body{font-size:16px}.eyebrow{font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#aaa;margin-top:14px}' +
    '.tag{font-size:22px;font-weight:700}ul{margin:6px 0;padding-left:20px}li{margin:4px 0}' +
    '@media print{.wrap{padding:24px}}' +
    '</style></head><body><div class="wrap">' +
    '<header><div class="sub">Brand kit</div><h1>' + escHtml(name) + '</h1></header>' +
    (briefRows ? '<section><h2>Overview</h2>' + briefRows + '</section>' : '') +
    (logoSvg ? sec('Logo', '<div class="logo">' + logoSvg + '</div>') : '') +
    sec('Color', paletteHtml) +
    sec('Typography', typeHtml) +
    sec('Guidelines', guidelinesHtml) +
    '<section class="note">Generated with Fluid.</section>' +
    '</div></body></html>';
}

const KitExport = ({ b }) => {
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const data = b.data || {};
  const hasLogo = !!pickLogoSvg(b);
  const hasPalette = !!(data.palette && (data.palette.colors || []).length);
  const slug = kitSlug(b.name_choice || b.name || 'brand');

  const dlSheet = () => { downloadBlob(slug + '-brand-kit.html', new Blob([buildBrandSheetHtml(b)], { type: 'text/html' })); setOpen(false); };
  const dlSvg = () => { const s = pickLogoSvg(b); if (s) downloadBlob(slug + '-logo.svg', new Blob([s], { type: 'image/svg+xml' })); setOpen(false); };
  const dlPng = async () => {
    const s = pickLogoSvg(b); if (!s) return;
    setBusy(true);
    try { downloadBlob(slug + '-logo.png', await svgToPngBlob(s, 512)); } catch { /* ignore */ }
    setBusy(false); setOpen(false);
  };
  const dlCss = () => { downloadBlob(slug + '-palette.css', new Blob([buildPaletteCss(b)], { type: 'text/css' })); setOpen(false); };

  const item = (label, onClick, enabled) => (
    <button onClick={enabled ? onClick : undefined} disabled={!enabled} style={{
      display: 'block', width: '100%', textAlign: 'left', padding: '9px 14px',
      background: 'transparent', border: 0, cursor: enabled ? 'pointer' : 'default',
      fontSize: 13, fontWeight: 500, color: enabled ? 'var(--fg-1)' : 'var(--fg-4)', fontFamily: 'inherit',
    }}>{label}</button>
  );

  return (
    <div style={{ position: 'relative', flex: '0 0 auto' }}>
      <button onClick={() => setOpen((o) => !o)} style={{
        padding: '11px 16px', borderRadius: 12, background: '#000', color: '#fff',
        fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 0,
        display: 'inline-flex', alignItems: 'center', gap: 8,
      }}>
        {busy ? 'Exporting…' : 'Export'}
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? 'rotate(180deg)' : 'none' }}><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
          <div style={{
            position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 41, minWidth: 210,
            background: 'var(--bg-elev)', borderRadius: 12, padding: 6,
            boxShadow: '0 12px 30px rgba(0,0,0,.16), inset 0 0 0 1px var(--line)',
          }}>
            {item('Brand sheet (.html)', dlSheet, true)}
            {item('Logo (SVG)', dlSvg, hasLogo)}
            {item('Logo (PNG)', dlPng, hasLogo)}
            {item('Palette (.css)', dlCss, hasPalette)}
            <div style={{ padding: '6px 14px 2px', fontSize: 10.5, color: 'var(--fg-4)', lineHeight: 1.4 }}>
              The brand sheet gathers everything — open it and print to PDF.
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const DirA_KitSummary = () => {
  const { draft } = useBrandDraft();
  const { navigate } = useRouter();
  const b = draft || {};
  const styleName = (VISUAL_STYLE_OPTIONS.find((o) => o.id === b.style_id) || {}).name || (b.style_id || '—');
  const rows = [
    { k: 'Name', v: b.name_choice || b.name || '—' },
    { k: 'Brief', v: b.brief || '—' },
    { k: 'Audience', v: b.audience || '—' },
    { k: 'Style', v: styleName },
    { k: 'Logo direction', v: b.logo_choice || '—' },
  ];
  return (
    <AShell activeNav="brands" breadcrumb={['Brands', b.name || 'Brand kit']}>
      <div style={{ height: '100%', overflowY: 'auto' }}>
        <div style={{ padding: '44px 56px 64px', maxWidth: 1080, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 30 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24 }}>
            <div>
              <div className="eyebrow" style={{ color: 'var(--fg-3)', marginBottom: 12 }}>Brand kit · {b.status === 'live' ? 'Live' : 'Draft'}</div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 48, letterSpacing: '-0.04em', lineHeight: 1, margin: 0, color: '#000' }}>{b.name || 'Your brand'}</h1>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '0 0 auto' }}>
              <button onClick={() => navigate('step4')} style={{ padding: '11px 16px', borderRadius: 12, background: 'var(--bg-elev)', color: 'var(--fg-1)', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: 'inset 0 0 0 1px var(--line)' }}>Iterate</button>
              <KitExport b={b} />
            </div>
          </div>

          <div style={{ background: 'var(--bg-elev)', borderRadius: 18, boxShadow: 'inset 0 0 0 1px var(--line)', padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="eyebrow" style={{ color: 'var(--fg-3)' }}>Your brief</div>
            {rows.map((r) => (
              <div key={r.k} style={{ display: 'flex', gap: 16, alignItems: 'baseline' }}>
                <div style={{ width: 130, flex: '0 0 130px', fontSize: 12.5, color: 'var(--fg-3)', fontWeight: 600 }}>{r.k}</div>
                <div style={{ flex: 1, fontSize: 14.5, color: '#000', lineHeight: 1.5 }}>{r.v}</div>
              </div>
            ))}
          </div>

          <KitLogoSection draft={draft} />

          <KitPaletteSection draft={draft} />

          <KitTypographySection draft={draft} />

          <KitGuidelinesSection draft={draft} />
        </div>
      </div>
    </AShell>
  );
};

Object.assign(window, {
  AppleLogo, FigmaLogo, PerplexityLogo, TeslaLogo,
  BrandLogoImg, BRAND_LOGO_SRC,
  AppleHero, FigmaHero, PerplexityHero, TeslaHero,
  APPLE_DISPLAY, APPLE_BODY, TESLA_TYPE, FIGMA_TYPE, PERPLEXITY_DISPLAY, PERPLEXITY_BODY,
  AShell,
  DirA_Brands,
  DirA_Step1_Brief,
  DirA_Step2_Style,
  DirA_Step3_Name,
  DirA_Step4_Logo
});

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
const COLLAGE_IMAGES = Array.from({ length: 24 }, (_, i) =>
  `${__assets['assets/collage/brand-' + String(i + 1).padStart(2, '0') + '.png']}`
);
const COL_1 = [0, 3, 6, 9, 12, 15, 18, 21].map((i) => COLLAGE_IMAGES[i]);
const COL_2 = [1, 4, 7, 10, 13, 16, 19, 22].map((i) => COLLAGE_IMAGES[i]);
const COL_3 = [2, 5, 8, 11, 14, 17, 20, 23].map((i) => COLLAGE_IMAGES[i]);

// ---- A single brand card --------------------------------------------
const BrandImgCard = ({ src }) => (
  <img
    src={src}
    alt=""
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
const ScrollColumn = ({ images, gap = 12, speed = 24, down = false, phase = 0 }) => {
  const ref = React.useRef(null);
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
    const waits = imgs.map((img) =>
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
  const cards = images.map((src, i) => <BrandImgCard key={i} src={src} />);
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
      }}
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
const BrandCollage = () => (
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

Object.assign(window, { BrandCollage });

// ------------------------------------------------------------------
// 04-assets
// ------------------------------------------------------------------
// =====================================================================
// Direction A · Assets — organized by brand
//
// The asset library, grouped by brand rather than one flat wall. Each
// brand owns a section: a header (mark · name · sector · count) and a
// grid of its assets — logomark, wordmark, app icon, palette, type
// specimen, key visual. Every thumbnail is rendered in the brand's own
// identity (logo, type, color) reusing the brand components from
// dir-a-canvas.jsx. Reuses AShell with the "Assets" rail item active.
// =====================================================================

const { useState: useAState } = React;

// ---- Icons (local, Lucide-ish) ---------------------------------------
const IcoDownload = ({ s = 14 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);
const IcoExpand = ({ s = 14 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
  </svg>
);
const IcoChevDown = ({ s = 13 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
);
const IcoArrow = ({ s = 14 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
);

// ---- Format tag tones -------------------------------------------------
const fmtTone = {
  SVG: { bg: 'rgba(68,217,199,.20)', fg: '#0E6B5E' },
  PNG: { bg: 'rgba(143,223,245,.30)', fg: '#2F6B83' },
  PDF: { bg: 'rgba(253,121,71,.18)',  fg: '#9A4A22' },
  ASE: { bg: 'rgba(165,120,255,.20)', fg: '#5B3F9E' },
  OTF: { bg: 'rgba(253,186,80,.22)',  fg: '#9A5A12' },
};
const FormatTag = ({ fmt }) => {
  return (
    <span style={{
      fontFamily: 'var(--font-mono)', fontSize: 9.5, fontWeight: 500, letterSpacing: '0.06em',
      padding: '2px 6px', borderRadius: 5, background: 'var(--bg-sunken)', color: 'var(--fg-3)', whiteSpace: 'nowrap',
    }}>{fmt}</span>
  );
};

// =====================================================================
// Brand definitions — surfaces, type, palette, marks
// =====================================================================

// ------------------------------------------------------------------
// 05-brands
// ------------------------------------------------------------------
// =====================================================================
// Direction A · Brands — populated (showcase) state
//
// What the Brands library looks like once the user actually has brands.
// Instead of the empty-state create flow, the four brands take the stage:
// each shown as a full identity sheet (reusing the brand hero sheets from
// dir-a-canvas.jsx) with a metadata footer — sector, asset count, last
// edited, status, and quick actions. A slim "new brand" strip keeps the
// create path available without stealing the spotlight.
//
// Reuses AShell (activeNav="brands"). Heroes/logos/fonts come from window.
// =====================================================================

const { useState: useBAState } = React;

// Pull the exported brand identity sheets (assigned by dir-a-canvas.jsx).
const BA_AppleHero = window.AppleHero;
const BA_FigmaHero = window.FigmaHero;
const BA_PerplexityHero = window.PerplexityHero;
const BA_TeslaHero = window.TeslaHero;

// ---- Brand records ----------------------------------------------------
const BA_IcoArrow = ({ s = 13 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
);
const BA_IcoExport = ({ s = 13 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></svg>
);
const BA_IcoChevDown = ({ s = 13 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
);
const BA_IcoPin = ({ s = 12 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M14 2l8 8-3 1-3 5-2 2-3-3-5 5-1-1 5-5-3-3 2-2 5-3z" /></svg>
);

const BA_StatusPill = ({ status }) => {
  const map = {
    live:  { dot: '#44D9C7', label: 'Live',  fg: '#0E6B5E', bg: 'rgba(68,217,199,.20)' },
    draft: { dot: 'var(--fg-4)', label: 'Draft', fg: 'var(--fg-3)', bg: 'var(--bg-sunken)' },
  };
  const s = map[status] || map.draft;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 10px', borderRadius: 999, background: s.bg, color: s.fg,
      fontSize: 11, fontWeight: 600, letterSpacing: '0.01em',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 99, background: s.dot }} />
      {s.label}
    </span>
  );
};

// ---- Brand showcase card ----------------------------------------------
// Reusable empty state — shown when a screen has no real content yet.
const AEmptyState = ({ title, body, ctaLabel, onCta }) => (
  <div style={{
    border: '1px dashed var(--line-strong)', borderRadius: 20,
    padding: '56px 40px', display: 'flex', flexDirection: 'column',
    alignItems: 'center', textAlign: 'center', gap: 12, background: 'var(--bg-elev)',
  }}>
    <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--fluid-gradient)', marginBottom: 4 }} />
    <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, letterSpacing: '-0.02em', margin: 0, color: '#000' }}>{title}</h3>
    <p style={{ fontSize: 14.5, color: 'var(--fg-2)', maxWidth: 420, lineHeight: 1.5, margin: 0 }}>{body}</p>
    {ctaLabel && (
      <button onClick={onCta} style={{ marginTop: 8, padding: '11px 18px', borderRadius: 12, background: '#000', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <PlusIcon size={14} /> {ctaLabel}
      </button>
    )}
  </div>
);

const BA_EmptyState = ({ onCreate }) => (
  <AEmptyState
    title="No brands yet"
    body="Start your first brand and it'll live here — every name, logo, palette and guideline you build with Fluid."
    ctaLabel="Create your first brand"
    onCta={onCreate}
  />
);

// Assets & Guides have no real content until brand generation (Phase 3), so
// new accounts see honest empty states rather than demo-brand material.
const DirA_AssetsScreen = () => {
  const { navigate } = useRouter();
  return (
    <AShell activeNav="assets" breadcrumb={['Assets']}>
      <div style={{ height: '100%', overflowY: 'auto' }}>
        <div style={{ padding: '44px 56px 64px', maxWidth: 1340, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 32 }}>
          <div>
            <div className="eyebrow" style={{ color: 'var(--fg-3)', marginBottom: 12 }}>Assets</div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 52, letterSpacing: '-0.04em', lineHeight: 1, margin: 0, color: '#000' }}>Your assets.</h1>
          </div>
          <AEmptyState
            title="No assets yet"
            body="Logos, wordmarks, app icons and exports show up here once you build a brand. Create one to get started."
            ctaLabel="Create a brand"
            onCta={() => navigate('step1')}
          />
        </div>
      </div>
    </AShell>
  );
};

const DirA_GuidesScreen = () => {
  const { navigate } = useRouter();
  return (
    <AShell activeNav="guides" breadcrumb={['Guides']}>
      <div style={{ height: '100%', overflowY: 'auto' }}>
        <div style={{ padding: '44px 56px 64px', maxWidth: 1340, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 32 }}>
          <div>
            <div className="eyebrow" style={{ color: 'var(--fg-3)', marginBottom: 12 }}>Guides</div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 52, letterSpacing: '-0.04em', lineHeight: 1, margin: 0, color: '#000' }}>Brand guidelines.</h1>
          </div>
          <AEmptyState
            title="No guidelines yet"
            body="Fluid writes usage rules for your logo, color, type and voice once your brand is generated. Build a brand to see them here."
            ctaLabel="Create a brand"
            onCta={() => navigate('step1')}
          />
        </div>
      </div>
    </AShell>
  );
};

// Relative "time ago" for real saved-brand timestamps.
function relTime(iso) {
  if (!iso) return '';
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'Just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  if (s < 172800) return 'Yesterday';
  return Math.floor(s / 86400) + 'd ago';
}

// Card for a real, user-saved brand (no mock Hero art — a gradient tile).
const BA_RealBrandCard = ({ brand, onOpen, onDelete }) => (
  <div
    onClick={onOpen}
    style={{
      borderRadius: 16, overflow: 'hidden', cursor: 'pointer', background: 'var(--bg-elev)',
      boxShadow: 'inset 0 0 0 1px var(--line)', display: 'flex', flexDirection: 'column',
      position: 'relative',
    }}
  >
    <button
      onClick={(e) => { e.stopPropagation(); onDelete && onDelete(); }}
      aria-label={'Delete ' + (brand.name || 'brand')}
      title="Delete brand"
      style={{
        position: 'absolute', top: 10, right: 10, width: 28, height: 28, borderRadius: 8,
        background: 'rgba(0,0,0,.35)', color: '#fff', border: 0, cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)',
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
    </button>
    <div style={{ height: 132, background: 'var(--fluid-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 700, color: '#fff', letterSpacing: '-0.03em' }}>
        {(brand.name || 'U').trim().charAt(0).toUpperCase()}
      </span>
    </div>
    <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, color: '#000', letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {brand.name || 'Untitled brand'}
        </span>
        <BA_StatusPill status={brand.status} />
      </div>
      <div style={{ fontSize: 13, color: 'var(--fg-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {brand.brief ? brand.brief : 'No description yet'}
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--fg-4)', fontFamily: 'var(--font-mono)' }}>
        Edited {relTime(brand.updated_at)}
      </div>
    </div>
  </div>
);

// =====================================================================
// The screen
// =====================================================================
const DirA_BrandsActive = () => {
  const { brands, loadBrand, refresh } = useBrandDraft();
  const { navigate } = useRouter();
  const [filter, setFilter] = useBAState('all');
  const deleteBrand = async (b) => {
    if (typeof window !== 'undefined' &&
        !window.confirm('Delete "' + (b.name || 'this brand') + '"? This can\'t be undone.')) return;
    if (await apiDeleteBrand(b.id)) refresh();
  };
  const filters = [
    { key: 'all', label: 'All', count: brands.length },
    { key: 'live', label: 'Live', count: brands.filter((b) => b.status === 'live').length },
    { key: 'draft', label: 'Drafts', count: brands.filter((b) => b.status === 'draft').length },
  ];
  const shown = brands.filter((b) => (filter === 'all' ? true : b.status === filter));

  return (
    <AShell activeNav="brands" breadcrumb={['Brands']}>
      <div style={{ height: '100%', overflowY: 'auto' }}>
        <div style={{ padding: '44px 56px 64px', maxWidth: 1340, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 32 }}>

          {/* ── Header ─────────────────────────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 32 }}>
            <div>
              <div className="eyebrow" style={{ color: 'var(--fg-3)', marginBottom: 12 }}>Library · {brands.length} {brands.length === 1 ? 'brand' : 'brands'}</div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 52, letterSpacing: '-0.04em', lineHeight: 1, margin: 0, color: '#000' }}>
                Your brands.
              </h1>
              <p style={{ fontSize: 16, color: 'var(--fg-2)', marginTop: 14, maxWidth: 560, lineHeight: 1.5 }}>
                Every identity you've built with Fluid — logos, palettes, type and guidelines — kept in one place. Open one to keep editing, or export the whole kit.
              </p>
            </div>
            <button style={{ padding: '12px 18px', borderRadius: 12, background: '#000', color: '#fff', fontSize: 14, fontWeight: 600, boxShadow: '0 1px 0 rgba(255,255,255,.1) inset, 0 8px 20px rgba(0,0,0,.18)', display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', flex: '0 0 auto' }}>
              <PlusIcon size={14} /> New brand
            </button>
          </div>

          {/* ── Toolbar ────────────────────────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18, borderBottom: '1px solid var(--line)', paddingBottom: 18 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {filters.map((f) => {
                const active = filter === f.key;
                return (
                  <button key={f.key} onClick={() => setFilter(f.key)} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: 999,
                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    background: active ? '#000' : 'var(--bg-elev)',
                    color: active ? '#fff' : 'var(--fg-2)',
                    boxShadow: active ? 'none' : 'inset 0 0 0 1px var(--line)',
                    transition: 'background .15s, color .15s',
                  }}>
                    {f.label}
                    <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: active ? 'rgba(255,255,255,.6)' : 'var(--fg-4)' }}>{f.count}</span>
                  </button>
                );
              })}
            </div>
            <button style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 12px', borderRadius: 10, background: 'transparent', color: 'var(--fg-2)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', flex: '0 0 auto' }}>
              Recently edited <BA_IcoChevDown />
            </button>
          </div>

          {/* ── Brand grid / empty state ───────────────────────────── */}
          {brands.length === 0 ? (
            <BA_EmptyState onCreate={() => navigate('step1')} />
          ) : (
            <div className="bacard-grid">
              {shown.map((b) => (
                <BA_RealBrandCard
                  key={b.id}
                  brand={b}
                  onOpen={() => {
                    loadBrand(b.id);
                    const step = b.status === 'live' ? 'step5' : ('step' + (b.step || 1));
                    navigate(step);
                  }}
                  onDelete={() => deleteBrand(b)}
                />
              ))}
            </div>
          )}

          {/* ── Slim create strip ──────────────────────────────────── */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 28,
            background: 'var(--bg-elev)', borderRadius: 18, padding: '22px 26px',
            boxShadow: 'var(--shadow-xs), inset 0 0 0 1px var(--line)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: 11, background: '#000', color: '#fff', flex: '0 0 40px' }}>
                <Sparkle size={16} color="#fff" />
              </span>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, letterSpacing: '-0.02em', color: '#000' }}>Start another brand</div>
                <div style={{ fontSize: 13, color: 'var(--fg-3)', marginTop: 2 }}>Brief to full identity in about 60 seconds — or browse 28 starter kits.</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flex: '0 0 auto' }}>
              <button style={{ padding: '10px 16px', borderRadius: 11, background: 'transparent', color: 'var(--fg-1)', fontSize: 13.5, fontWeight: 600, boxShadow: 'inset 0 0 0 1px var(--line-strong)', cursor: 'pointer' }}>
                Browse kits
              </button>
              <button style={{ padding: '10px 16px', borderRadius: 11, background: '#000', color: '#fff', fontSize: 13.5, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                New brand <BA_IcoArrow s={13} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </AShell>
  );
};

// ---- Styles (injected once) ------------------------------------------
if (typeof document !== 'undefined' && !document.getElementById('brands-active-css')) {
  const s = document.createElement('style');
  s.id = 'brands-active-css';
  s.textContent = `
    .bacard-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 22px; }
    @media (max-width: 1040px) { .bacard-grid { grid-template-columns: 1fr; } }
    .bacard {
      background: var(--bg-elev); border-radius: 20px; overflow: hidden;
      box-shadow: var(--shadow-sm), inset 0 0 0 1px var(--line);
      display: flex; flex-direction: column; cursor: pointer;
      transition: transform .2s var(--ease-out), box-shadow .2s var(--ease-out);
    }
    .bacard:hover { transform: translateY(-4px); box-shadow: var(--shadow-md), inset 0 0 0 1px var(--line); }
    .bacard-hero { position: relative; overflow: hidden; }
    .bacard-pin {
      position: absolute; top: 12px; left: 12px; z-index: 3;
      width: 24px; height: 24px; border-radius: 8px;
      background: rgba(255,255,255,.9); color: #16181C;
      display: inline-flex; align-items: center; justify-content: center;
      box-shadow: 0 2px 8px rgba(0,0,0,.18);
    }
    .bacard-overlay {
      position: absolute; inset: 0; z-index: 2;
      display: flex; align-items: flex-end; justify-content: flex-end; gap: 8px;
      padding: 16px; opacity: 0; transition: opacity .2s var(--ease-out);
      background: linear-gradient(to top, rgba(0,0,0,.28), rgba(0,0,0,0) 42%);
    }
    .bacard:hover .bacard-overlay { opacity: 1; }
    .bacard-open {
      display: inline-flex; align-items: center; gap: 7px; border: 0; cursor: pointer;
      padding: 10px 16px; border-radius: 11px; background: #fff; color: #16181C;
      font-size: 13.5px; font-weight: 600; box-shadow: 0 4px 14px rgba(0,0,0,.22);
      transition: transform .12s var(--ease-out);
    }
    .bacard-open:hover { transform: scale(1.03); }
    .bacard-export {
      width: 38px; height: 38px; border-radius: 11px; border: 0; cursor: pointer;
      background: rgba(255,255,255,.94); color: #16181C;
      display: inline-flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 14px rgba(0,0,0,.22);
      transition: transform .12s var(--ease-out);
    }
    .bacard-export:hover { transform: scale(1.06); }
    .bacard-foot { padding: 18px 20px 20px; }
  `;
  document.head.appendChild(s);
}

Object.assign(window, { DirA_BrandsActive });

// ------------------------------------------------------------------
// ------------------------------------------------------------------
// 08-home
// ------------------------------------------------------------------
// =====================================================================
// Direction A · Home
//
// The workspace launchpad. Distinct from the Brands library (a gallery
// of kits + templates). Home is personal and action-first:
//   1. Greeting + status.
//   2. A black "start a brand" hero CTA + focused quick paths
//      (Rebranding · Logo · Name · Guidelines) — same model as Brands.
//   3. "Pick up where you left off" — in-progress brands with step state.
//   4. A light activity feed + a Fluid nudge.
// Reuses AShell (top dock + rail) from dir-a-canvas, with Home active.
// =====================================================================

// ---- Small brand mood tile reused in the resume row -------------------
const HomeMark = ({ mood, mark, logo, w = 60, h = 60, radius = 12 }) =>
<div style={{
  width: w, height: h, flex: `0 0 ${w}px`, borderRadius: radius,
  background: mood.bg, color: mood.fg,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontFamily: 'var(--font-display)', fontWeight: mark.weight,
  fontSize: mark.size, letterSpacing: mark.tracking, lineHeight: 1,
  boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.06)', overflow: 'hidden'
}}>
    {logo ? logo : <>{mark.text}{mark.dot && <span style={{ color: mark.dotColor || mood.fg }}>.</span>}</>}
  </div>;


// ---- Step progress dots (compact) -------------------------------------
const StepDots = ({ step, total }) =>
<div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
    {Array.from({ length: total }).map((_, i) =>
  <span key={i} style={{
    width: i < step ? 16 : 7, height: 7, borderRadius: 99,
    background: i < step ? '#000' : 'var(--line-strong)',
    transition: 'all .2s'
  }} />
  )}
  </div>;


// ---- Resume card — an in-progress brand --------------------------------
const ResumeCard = ({ name, kind, step, total, stepLabel, updated, mood, mark, logo, featured, palette, typeFont, typeName }) =>
<div style={{
  background: 'var(--bg-elev)', borderRadius: 18,
  boxShadow: featured ? 'var(--shadow-sm)' : 'var(--shadow-xs), inset 0 0 0 1px var(--line)',
  padding: featured ? 22 : 18,
  display: 'flex', flexDirection: 'column', gap: 16, cursor: 'pointer',
  position: 'relative', overflow: 'hidden'
}}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <HomeMark mood={mood} mark={mark} logo={logo} w={featured ? 64 : 52} h={featured ? 64 : 52} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: featured ? 22 : 18, letterSpacing: '-0.025em', color: '#000' }}>{name}</span>
          {featured && <Chip tone="live">In progress</Chip>}
        </div>
        <div style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 3 }}>{kind} · edited {updated}</div>
      </div>
    </div>

    {/* Brand preview — typography specimen + color palette */}
    {palette &&
  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0, flex: '0 0 auto' }}>
          <span style={{ fontFamily: typeFont, fontWeight: 600, fontSize: 24, letterSpacing: '-0.02em', color: '#000', lineHeight: 1 }}>Ag</span>
          <span style={{ fontSize: 9.5, color: 'var(--fg-4)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>{typeName}</span>
        </div>
        <div style={{ width: 1, height: 30, background: 'var(--line)' }} />
        <div style={{ display: 'flex', gap: 4, flex: 1 }}>
          {palette.map((c, i) =>
      <div key={i} style={{ flex: 1, height: 26, borderRadius: 5, background: c, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.07)' }} />
      )}
        </div>
      </div>
  }

    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <StepDots step={step} total={total} />
      <span style={{ fontSize: 11.5, color: 'var(--fg-3)', fontFamily: 'var(--font-mono)' }}>{step}/{total}</span>
      <div style={{ flex: 1 }} />
      <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fg-2)' }}>{stepLabel}</span>
    </div>

    <button style={{
    marginTop: 2, padding: '10px 14px', borderRadius: 10,
    background: featured ? '#000' : 'var(--bg-sunken)',
    color: featured ? '#fff' : 'var(--fg-1)',
    fontSize: 12.5, fontWeight: 600, border: 0, cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    boxShadow: featured ? '0 6px 18px rgba(0,0,0,.16)' : 'none'
  }}>
      Resume {name} <ArrowRight size={13} />
    </button>
  </div>;


// ---- Quick path card — focus on one thing ------------------------------
const QuickPath = ({ title, sub, icon, preview, previewBg, previewPos, customPreview }) =>
<div style={{
  background: 'var(--bg-elev)', borderRadius: 16,
  boxShadow: 'var(--shadow-xs), inset 0 0 0 1px var(--line)',
  display: 'flex', flexDirection: 'column', cursor: 'pointer', overflow: 'hidden'
}}>
    <div style={{
    height: 116, background: previewBg || 'var(--bg-sunken)',
    position: 'relative', overflow: 'hidden', boxShadow: 'inset 0 -1px 0 var(--line)'
  }}>
      {customPreview ||
    <img src={preview} alt="" draggable={false} style={{
      width: '100%', height: '100%', objectFit: 'cover',
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
  </div>;


// ---- Activity feed item ------------------------------------------------
const ActivityItem = ({ icon, accent, lead, body, when }) =>
<div style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--line)' }}>
    <div style={{
    width: 30, height: 30, flex: '0 0 30px', borderRadius: 8,
    background: accent || 'var(--bg-sunken)',
    color: accent ? '#fff' : 'var(--fg-2)',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
  }}>{icon}</div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 13, color: 'var(--fg-1)', lineHeight: 1.4 }}>
        <span style={{ fontWeight: 600 }}>{lead}</span> {body}
      </div>
      <div style={{ fontSize: 11, color: 'var(--fg-4)', marginTop: 3, fontFamily: 'var(--font-mono)' }}>{when}</div>
    </div>
  </div>;


const DirA_Home = () => {
  const { user, brands, loadBrand } = useBrandDraft();
  const { navigate } = useRouter();
  const drafts = brands.filter((b) => b.status === 'draft');
  const firstName = user && user.name ? user.name.trim().split(/\s+/)[0] : 'there';
  const hour = new Date().getHours();
  const partOfDay = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  const progressLine = drafts.length === 0
    ? "You have no brands in progress yet. Start your first one with Fluid."
    : drafts.length === 1
      ? "You have 1 brand in progress. Pick it up, or start something new."
      : "You have " + drafts.length + " brands in progress. Pick one up, or start something new.";
  return (
<AShell activeNav="home" breadcrumb={['Home']}>
    <div style={{ padding: '48px 56px 64px', maxWidth: 1240, display: 'flex', flexDirection: 'column', gap: 40 }}>

      {/* ── Greeting ───────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 32 }}>
        <div>
          <div className="eyebrow" style={{ color: 'var(--fg-3)', marginBottom: 12 }}>{today}</div>
          <h1 style={{
          fontFamily: 'var(--font-display)', fontWeight: 800,
          fontSize: 52, letterSpacing: '-0.04em', lineHeight: 1, margin: 0, color: '#000'
        }}>Good {partOfDay}, {firstName}.</h1>
          <p style={{ fontSize: 16, color: 'var(--fg-2)', marginTop: 14, maxWidth: 520, lineHeight: 1.5 }}>
            {progressLine}
          </p>
        </div>
      </div>

      {/* ════ YOUR BRANDS — pick up where you left off ════════════════ */}
      {drafts.length > 0 && (
      <section>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16 }}>
          <div className="eyebrow" style={{ color: 'var(--fg-3)' }}>Pick up where you left off</div>
          <button onClick={() => navigate('brands')} style={{ padding: '7px 12px', borderRadius: 10, background: 'transparent', color: 'var(--fg-2)', fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6, border: 0, cursor: 'pointer' }}>
            All brands <ArrowRight size={11} />
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {drafts.slice(0, 4).map((b) => (
            <div key={b.id}
              onClick={() => { loadBrand(b.id); navigate('step' + (b.step || 1)); }}
              style={{ borderRadius: 16, overflow: 'hidden', cursor: 'pointer', background: 'var(--bg-elev)', boxShadow: 'inset 0 0 0 1px var(--line)' }}>
              <div style={{ height: 96, background: 'var(--fluid-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700, color: '#fff' }}>{(b.name || 'U').trim().charAt(0).toUpperCase()}</span>
              </div>
              <div style={{ padding: '13px 15px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: '#000', letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name || 'Untitled brand'}</span>
                <span style={{ fontSize: 11.5, color: 'var(--fg-3)', fontFamily: 'var(--font-mono)' }}>Step {b.step || 1} of 5</span>
              </div>
            </div>
          ))}
        </div>
      </section>
      )}

      {/* divider — separates your existing brands from creating a new one */}
      {drafts.length > 0 && <div style={{ height: 1, background: 'var(--line)' }} />}

      {/* ════ START SOMETHING NEW — create a brand ════════════════════ */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="eyebrow" style={{ color: 'var(--fg-3)' }}>Or, start a new brand</div>
      {/* Hero CTA — white card (matches the Brands hero) */}
      <div style={{
        position: 'relative', background: 'var(--bg-elev)',
        borderRadius: 24, padding: '36px 40px', overflow: 'hidden',
        display: 'flex', alignItems: 'center', gap: 48,
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 11px', borderRadius: 99, background: 'var(--bg-sunken)', marginBottom: 16 }}>
            <span style={{ width: 13, height: 13, borderRadius: 99, background: 'var(--fl-accent)' }} />
            <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--fg-2)' }}>AI brand agent</span>
          </span>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 40, letterSpacing: '-0.032em', lineHeight: 1.02, margin: '0 0 14px', color: '#000', maxWidth: 480 }}>
            From idea to identity — instantly.
          </h2>
          <p style={{ fontSize: 15.5, color: 'var(--fg-2)', margin: '0 0 24px', maxWidth: 490, lineHeight: 1.5 }}>
            Tell Fluid about your idea. We'll draft a strategy, name, logo, palette and type — in about 60&nbsp;seconds.
          </p>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button style={{ padding: '12px 20px', borderRadius: 12, background: '#000', color: '#fff', fontSize: 14, fontWeight: 700, border: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              Start a new brand <ArrowRight size={14} />
            </button>
            <button style={{ padding: '12px 18px', borderRadius: 12, background: 'transparent', color: 'var(--fg-1)', fontSize: 14, fontWeight: 600, border: 0, cursor: 'pointer', boxShadow: 'inset 0 0 0 1px var(--line-strong)' }}>
              Browse templates
            </button>
          </div>
        </div>

        {/* dynamic vertical-scrolling collage of brand work */}
        <BrandCollage />
      </div>

      {/* ── Focus on one thing — quick paths (part of the same section) ── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
          <div className="eyebrow" style={{ color: 'var(--fg-3)' }}>Or, focus on one thing</div>
          <div style={{ fontSize: 12, color: 'var(--fg-4)' }}>4 quick paths</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          <QuickPath
            title="Rebranding"
            sub="Refresh an existing brand. Keep what works, update the rest."
            preview={__assets['assets/min/preview-rebranding.jpg']} previewBg="#EC4C34"
            icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>} />
          
          <QuickPath
            title="Logo"
            sub="Skip the strategy. Drop a name, get marks in seconds."
            preview={__assets['assets/min/preview-logo.jpg']} previewBg="#1E6BF5"
            icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3" /></svg>} />
          
          <QuickPath
            title="Name"
            sub="Nine names with reasoning and domain status."
            previewBg="#F4F4F5"
            customPreview={
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 9 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 34, letterSpacing: '-0.03em', color: '#0E0E0E', lineHeight: 1 }}>Cadence<span style={{ color: '#FD7947' }}>.</span></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ width: 6, height: 6, borderRadius: 99, background: '#2BBBA3' }} />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.04em', color: 'var(--fg-3)' }}>.com available · +8 names</span>
                </div>
              </div>
            }
            icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 7 4 4 20 4 20 7" /><line x1="9" y1="20" x2="15" y2="20" /><line x1="12" y1="4" x2="12" y2="20" /></svg>} />
          
          <QuickPath
            title="Guidelines"
            sub="Already have a logo and palette? We'll write the rules."
            previewBg="#FFFFFF"
            customPreview={
            <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
                <div style={{ flex: '0 0 42%', background: '#0E0F12', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 30, color: '#fff', letterSpacing: '-0.03em' }}>Aa</span>
                </div>
                <div style={{ flex: 1, background: '#FFFFFF', padding: '0 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', color: 'var(--fg-4)' }}>01 · LOGO</span>
                  {[1, 0.7, 0.85].map((w, i) =>
                <div key={i} style={{ height: 4, width: `${w * 100}%`, background: '#E6E6E8', borderRadius: 2 }} />
                )}
                </div>
              </div>
            }
            icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /><line x1="9" y1="7" x2="16" y2="7" /></svg>} />
          
        </div>
      </div>

      </section>


    </div>
  </AShell>
  );
};


Object.assign(window, { DirA_Home, QuickPath });
// ------------------------------------------------------------------
// 09-settings
// ------------------------------------------------------------------
// =====================================================================
// Direction A · Settings
//
// A focused, single-purpose settings surface that lives inside AShell
// (activeNav="settings"). A slim settings sub-nav on the left switches
// between sections; the panel on the right holds the controls.
//
// The distinctive section is "Fluid AI" — how the agent behaves, how much
// of its reasoning is shown, and the defaults it reaches for. Everything
// else (Account, Workspace, Members, Plan, Integrations, Notifications)
// uses the same calm card + black-accent vocabulary as the rest of A.
// =====================================================================

const { useState: useSetState } = React;

// ---------------------------------------------------------------------
// Form primitives
// ---------------------------------------------------------------------

// Self-contained pill toggle. Black when on, hairline well when off.
const Toggle = ({ defaultOn = false }) => {
  const [on, setOn] = useSetState(defaultOn);
  return (
    <button
      onClick={() => setOn((v) => !v)}
      aria-pressed={on}
      style={{
        width: 42, height: 24, borderRadius: 999, padding: 2, flex: '0 0 42px',
        background: on ? '#000' : 'var(--bg-sunken)',
        boxShadow: on ? 'none' : 'inset 0 0 0 1px var(--line-strong)',
        cursor: 'pointer', transition: 'background .18s var(--ease-out)',
        display: 'flex', alignItems: 'center',
      }}
    >
      <span style={{
        width: 20, height: 20, borderRadius: 999, background: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,.25)',
        transform: on ? 'translateX(18px)' : 'translateX(0)',
        transition: 'transform .18s var(--ease-spring)',
      }} />
    </button>
  );
};

// Segmented control — pill well with a white "selected" chip.
const Segmented = ({ options, defaultValue, onChange, size = 'md' }) => {
  const [val, setVal] = useSetState(defaultValue ?? options[0]);
  const pad = size === 'sm' ? '6px 12px' : '8px 16px';
  const fs = size === 'sm' ? 12 : 13;
  return (
    <div style={{
      display: 'inline-flex', gap: 3, padding: 3, borderRadius: 999,
      background: 'var(--bg-sunken)', boxShadow: 'inset 0 0 0 1px var(--line)',
    }}>
      {options.map((o) => {
        const active = o === val;
        return (
          <button key={o} onClick={() => { setVal(o); onChange && onChange(o); }} style={{
            padding: pad, borderRadius: 999, fontSize: fs, fontWeight: 600,
            letterSpacing: '-0.005em', cursor: 'pointer', whiteSpace: 'nowrap',
            background: active ? 'var(--bg-elev)' : 'transparent',
            color: active ? 'var(--fg-1)' : 'var(--fg-3)',
            boxShadow: active ? 'var(--shadow-xs), inset 0 0 0 1px var(--line)' : 'none',
            transition: 'background .15s, color .15s',
          }}>{o}</button>
        );
      })}
    </div>
  );
};

// Text-input look (read-only specimen — this is a static prototype).
const Field = ({ label, value, sub, suffix, mono, wide }) => (
  <label style={{ display: 'flex', flexDirection: 'column', gap: 7, flex: wide ? '1 1 100%' : '1 1 240px', minWidth: 0 }}>
    <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fg-2)' }}>{label}</span>
    <span style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '11px 14px', borderRadius: 11, background: 'var(--bg)',
      boxShadow: 'inset 0 0 0 1px var(--line)',
      fontSize: 14, color: value ? 'var(--fg-1)' : 'var(--fg-4)',
      fontFamily: mono ? 'var(--font-mono)' : 'inherit',
    }}>
      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
      {suffix}
    </span>
    {sub && <span style={{ fontSize: 11.5, color: 'var(--fg-4)' }}>{sub}</span>}
  </label>
);

// Select-look field (chevron on the right).
const SelectField = ({ label, value, wide }) => (
  <Field label={label} value={value} wide={wide} suffix={
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--fg-4)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
  } />
);

// A control row: title + description on the left, control on the right.
const Row = ({ title, desc, children, last }) => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 28,
    padding: '18px 0', borderBottom: last ? 'none' : '1px solid var(--line)',
  }}>
    <div style={{ minWidth: 0, maxWidth: 480 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-1)' }}>{title}</div>
      {desc && <div style={{ fontSize: 12.5, color: 'var(--fg-3)', marginTop: 3, lineHeight: 1.45 }}>{desc}</div>}
    </div>
    <div style={{ flex: '0 0 auto' }}>{children}</div>
  </div>
);

// Card wrapper + optional header.
const Card = ({ title, desc, children, pad = 24, accent }) => (
  <section style={{
    background: 'var(--bg-elev)', borderRadius: 20,
    boxShadow: 'var(--shadow-xs), inset 0 0 0 1px var(--line)',
    overflow: 'hidden',
  }}>
    {accent && <div style={{ height: 3, background: 'var(--fl-accent)' }} />}
    {title && (
      <div style={{ padding: `${pad}px ${pad}px 0` }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, letterSpacing: '-0.02em', color: '#000', margin: 0 }}>{title}</h3>
        {desc && <p style={{ fontSize: 13, color: 'var(--fg-3)', margin: '6px 0 0', lineHeight: 1.5, maxWidth: 560 }}>{desc}</p>}
      </div>
    )}
    <div style={{ padding: pad }}>{children}</div>
  </section>
);

// Sticky-feeling footer with unsaved-changes affordance.
const SaveBar = () => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20,
    padding: '14px 18px', borderRadius: 14, background: 'var(--bg-elev)',
    boxShadow: 'var(--shadow-sm), inset 0 0 0 1px var(--line)',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 12.5, color: 'var(--fg-3)' }}>
      <span style={{ width: 7, height: 7, borderRadius: 99, background: 'var(--fluid-coral)' }} />
      You have unsaved changes
    </div>
    <div style={{ display: 'flex', gap: 10 }}>
      <button style={{ padding: '9px 16px', borderRadius: 10, background: 'transparent', color: 'var(--fg-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: 'inset 0 0 0 1px var(--line-strong)' }}>Cancel</button>
      <button style={{ padding: '9px 18px', borderRadius: 10, background: '#000', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 6px 16px rgba(0,0,0,.16)' }}>Save changes</button>
    </div>
  </div>
);

const SectionHead = ({ eyebrow, title, desc }) => (
  <div style={{ marginBottom: 6 }}>
    <div className="eyebrow" style={{ color: 'var(--fg-3)', marginBottom: 12 }}>{eyebrow}</div>
    <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 38, letterSpacing: '-0.035em', lineHeight: 1, margin: 0, color: '#000' }}>{title}</h1>
    {desc && <p style={{ fontSize: 15, color: 'var(--fg-2)', marginTop: 12, maxWidth: 560, lineHeight: 1.5 }}>{desc}</p>}
  </div>
);

// ---------------------------------------------------------------------
// Section: Account
// ---------------------------------------------------------------------
const SecAccount = () => {
  const { user } = useBrandDraft();
  const name = (user && user.name) || '';
  const email = (user && user.email) || '';
  const initial = (user && user.initial) || '·';
  return (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
    <SectionHead eyebrow="Settings · Account" title="Account." desc="Your personal profile and sign-in. This is how you appear across Fluid." />

    <Card title="Profile">
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, paddingBottom: 22, marginBottom: 4, borderBottom: '1px solid var(--line)' }}>
        <div style={{ width: 64, height: 64, borderRadius: 999, background: '#000', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26, flex: '0 0 64px' }}>{initial}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: '#000', letterSpacing: '-0.02em' }}>{name || 'Your name'}</div>
          <div style={{ fontSize: 12.5, color: 'var(--fg-3)', marginTop: 2 }}>PNG, JPG or SVG · up to 2&nbsp;MB</div>
        </div>
        <div style={{ display: 'flex', gap: 9 }}>
          <button style={{ padding: '9px 14px', borderRadius: 10, background: 'var(--bg-sunken)', color: 'var(--fg-1)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>Change photo</button>
          <button style={{ padding: '9px 14px', borderRadius: 10, background: 'transparent', color: 'var(--fg-3)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>Remove</button>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, paddingTop: 18 }}>
        <Field label="Full name" value={name || '—'} />
        <Field label="Email" value={email || '—'} suffix={<Chip tone="live">Verified</Chip>} />
        <SelectField label="Language" value="English (US)" />
        <SelectField label="Time zone" value="GMT−8 · Pacific" />
      </div>
    </Card>

    <Card title="Security">
      <Row title="Two-factor authentication" desc="Require a one-time code from your authenticator app at sign-in.">
        <Toggle defaultOn />
      </Row>
      <Row title="Password" desc="Last changed 4 months ago.">
        <button style={{ padding: '9px 14px', borderRadius: 10, background: 'var(--bg-sunken)', color: 'var(--fg-1)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>Update password</button>
      </Row>
      <Row title="Active sessions" desc="2 devices currently signed in." last>
        <button style={{ padding: '9px 14px', borderRadius: 10, background: 'transparent', color: 'var(--fg-2)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', boxShadow: 'inset 0 0 0 1px var(--line-strong)' }}>Manage</button>
      </Row>
    </Card>

    <Card title="Session">
      <Row title="Log out" desc="Sign out of Fluid on this device." last>
        <form action="/api/auth/logout" method="post" data-no-route style={{ display: 'inline' }}>
          <button type="submit" style={{ padding: '9px 16px', borderRadius: 10, background: 'transparent', color: 'var(--destructive)', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', border: 'none', boxShadow: 'inset 0 0 0 1px rgba(214,69,69,0.4)' }}>Log out</button>
        </form>
      </Row>
    </Card>

    <SaveBar />
  </div>
  );
};

// ---------------------------------------------------------------------
// Section: Workspace
// ---------------------------------------------------------------------
const SecWorkspace = () => {
  const { user, brands } = useBrandDraft();
  const wsName = user && user.name ? user.name.trim().split(/\s+/)[0] + "'s workspace" : 'Your workspace';
  const wsInitial = (user && user.initial) || '·';
  const brandCount = brands.length + ' ' + (brands.length === 1 ? 'brand' : 'brands');
  return (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
    <SectionHead eyebrow="Settings · Workspace" title="Workspace." desc="The home for your brands, assets and guidelines." />

    <Card title="Identity">
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, paddingBottom: 22, marginBottom: 4, borderBottom: '1px solid var(--line)' }}>
        <div style={{ width: 64, height: 64, borderRadius: 16, background: 'var(--fl-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26, color: '#000', flex: '0 0 64px', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.08)' }}>{wsInitial}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: '#000', letterSpacing: '-0.02em' }}>{wsName}</div>
          <div style={{ fontSize: 12.5, color: 'var(--fg-3)', marginTop: 2 }}>{brandCount}</div>
        </div>
        <button style={{ padding: '9px 14px', borderRadius: 10, background: 'var(--bg-sunken)', color: 'var(--fg-1)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>Replace icon</button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, paddingTop: 18 }}>
        <Field label="Workspace name" value={wsName} />
        <SelectField label="Default language" value="English (US)" />
      </div>
    </Card>

    <Card title="Defaults">
      <Row title="New brand visibility" desc="Who can see a brand the moment it's created.">
        <Segmented options={["Private", "Team", "Public"]} defaultValue="Team" size="sm" />
      </Row>
      <Row title="Asset library" desc="Let everyone in the workspace reuse logos, palettes and type." last>
        <Toggle defaultOn />
      </Row>
    </Card>

    <Card>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--destructive)' }}>Delete workspace</div>
          <div style={{ fontSize: 12.5, color: 'var(--fg-3)', marginTop: 3, maxWidth: 460, lineHeight: 1.45 }}>Permanently remove this workspace and all of its brands, assets and guidelines. This cannot be undone.</div>
        </div>
        <button style={{ padding: '9px 16px', borderRadius: 10, background: 'transparent', color: 'var(--destructive)', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: 'inset 0 0 0 1px rgba(214,69,69,.4)', flex: '0 0 auto' }}>Delete workspace</button>
      </div>
    </Card>
  </div>
  );
};

// ---------------------------------------------------------------------
// Section: Fluid AI  (the distinctive one)
// ---------------------------------------------------------------------
const StyleChip = ({ label, on }) => (
  <button style={{
    padding: '8px 15px', borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: 'pointer',
    background: on ? '#000' : 'var(--bg-elev)', color: on ? '#fff' : 'var(--fg-2)',
    boxShadow: on ? 'none' : 'inset 0 0 0 1px var(--line)',
  }}>{label}</button>
);

const SecFluid = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
    <SectionHead eyebrow="Settings · Fluid AI" title="Fluid AI." desc="Shape how the agent works — how much of its thinking you see, and the defaults it reaches for when drafting a brand." />

    <Card accent title="Reasoning & behaviour" desc="Fluid narrates its choices in the bottom dock as it works. Tune how present that voice is.">
      <Row title="Show reasoning in the dock" desc="Stream Fluid's thinking as it drafts strategy, names and logos.">
        <Toggle defaultOn />
      </Row>
      <Row title="Creativity" desc="How far Fluid strays from safe, conventional territory.">
        <Segmented options={["Measured", "Balanced", "Experimental"]} defaultValue="Balanced" size="sm" />
      </Row>
      <Row title="Auto-suggest next steps" desc="Light up adjacent cards with proposals as you fill one in.">
        <Toggle defaultOn />
      </Row>
      <Row title="Live brand references" desc="Let Fluid look at real-world brands on the web for inspiration." last>
        <Toggle />
      </Row>
    </Card>

    <Card title="Generation defaults" desc="Where every new brand starts before you steer it.">
      <Row title="Default direction" desc="The aesthetic Fluid leans toward on the first pass.">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <StyleChip label="Minimal" on />
          <StyleChip label="Bold" />
          <StyleChip label="Playful" />
          <StyleChip label="Editorial" />
        </div>
      </Row>
      <Row title="Palette size" desc="How many colors a generated kit includes by default.">
        <Segmented options={["5", "6", "8"]} defaultValue="6" size="sm" />
      </Row>
      <Row title="Logo concepts per run" desc="Marks drafted each time you generate.">
        <Segmented options={["3", "6", "9"]} defaultValue="6" size="sm" />
      </Row>
      <Row title="Generation quality" desc="Higher quality is slower but more refined." last>
        <Segmented options={["Draft", "Standard", "High"]} defaultValue="Standard" size="sm" />
      </Row>
    </Card>

    <SaveBar />
  </div>
);

const SecIntegrations = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
    <SectionHead eyebrow="Settings · Integrations" title="Integrations." desc="Connect Fluid to the tools where your brand work actually lives." />
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
      {INTEGRATIONS.map((it) => <IntegrationCard key={it.name} it={it} />)}
    </div>
  </div>
);

// ---------------------------------------------------------------------
// Section: Notifications
// ---------------------------------------------------------------------
const NotifRow = ({ title, desc, email, app, last }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 24, padding: '15px 0', borderBottom: last ? 'none' : '1px solid var(--line)' }}>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-1)' }}>{title}</div>
      {desc && <div style={{ fontSize: 12.5, color: 'var(--fg-3)', marginTop: 2 }}>{desc}</div>}
    </div>
    <div style={{ flex: '0 0 64px', display: 'flex', justifyContent: 'center' }}><Toggle defaultOn={email} /></div>
    <div style={{ flex: '0 0 64px', display: 'flex', justifyContent: 'center' }}><Toggle defaultOn={app} /></div>
  </div>
);

const SecNotifications = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
    <SectionHead eyebrow="Settings · Notifications" title="Notifications." desc="Choose what Fluid tells you about, and where it reaches you." />
    <Card title="Preferences">
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, paddingBottom: 6, borderBottom: '1px solid var(--line)' }}>
        <div style={{ flex: 1 }} />
        <div style={{ flex: '0 0 64px', textAlign: 'center', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--fg-4)' }}>Email</div>
        <div style={{ flex: '0 0 64px', textAlign: 'center', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--fg-4)' }}>In-app</div>
      </div>
      <NotifRow title="Brand generation complete" desc="When Fluid finishes drafting a brand or asset." email app />
      <NotifRow title="Comments & mentions" desc="When a teammate replies or @-mentions you." email app />
      <NotifRow title="Weekly summary" desc="A digest of activity across the workspace." email={false} app />
      <NotifRow title="Product updates" desc="New features and improvements from Fluid." email app={false} />
      <NotifRow title="Billing alerts" desc="Payment receipts and credit warnings." email app last />
    </Card>
  </div>
);

// ---------------------------------------------------------------------
// Settings shell — sub-nav + active section
// ---------------------------------------------------------------------
// ---------------------------------------------------------------------
// Section: Billing (Stripe)
// ---------------------------------------------------------------------
// Subscription tiers — kept in sync with src/lib/stripe.ts (TIERS).
const BILLING_TIERS = [
  { id: 'starter', name: 'Starter', tokens: 150, price: '$12', period: '/mo', blurb: 'For getting a brand off the ground.' },
  { id: 'pro', name: 'Pro', tokens: 500, price: '$36', period: '/mo', blurb: 'For agencies and frequent builders.', featured: true },
];
const TIER_LABEL = { free: 'Free', starter: 'Starter', pro: 'Pro' };

const SecBilling = () => {
  const [status, setStatus] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState('');
  const [error, setError] = React.useState('');
  const justUpgraded = typeof window !== 'undefined' && /[?&]billing=success/.test(window.location.search);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/billing/status', { cache: 'no-store' });
      const j = await r.json().catch(() => ({}));
      setStatus(r.ok ? j : null);
    } catch { setStatus(null); }
    setLoading(false);
    // Keep the top-bar token pill in sync with what this page shows.
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('fluid:balance-changed'));
  }, []);
  React.useEffect(() => { load(); }, [load]);

  // POST a JSON body (checkout needs a tier); portal needs none.
  const go = async (path, which, body) => {
    setBusy(which); setError('');
    try {
      const r = await fetch(path, {
        method: 'POST',
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.url) { window.location.assign(j.url); return; }
      setError(j.error || "Couldn't continue. Please try again.");
    } catch { setError('Network error. Check your connection and try again.'); }
    setBusy('');
  };

  const tier = (status && status.tier) || 'free';
  const isSubscriber = tier === 'starter' || tier === 'pro';
  const balance = (status && typeof status.balance === 'number') ? status.balance : 0;
  const monthly = (status && status.monthlyTokens) || 0;

  const primaryBtn = { padding: '10px 16px', borderRadius: 10, background: '#000', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 0 };
  const ghostBtn = { padding: '10px 16px', borderRadius: 10, background: 'transparent', color: 'var(--fg-1)', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: 'inset 0 0 0 1px var(--line-strong)', border: 0 };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionHead eyebrow="Settings · Billing" title="Billing." desc="Tokens power everything Fluid generates. Subscribe for a monthly refill." />

      {justUpgraded && (
        <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(68,217,199,.12)', boxShadow: 'inset 0 0 0 1px rgba(68,217,199,.35)', fontSize: 13, color: '#0E6B5E' }}>
          Thanks! Your payment is processing — your tokens and plan will update in a moment. <button onClick={load} style={{ background: 'transparent', border: 0, color: '#0E6B5E', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>Refresh</button>
        </div>
      )}

      <Card title="Token balance">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 34, color: '#000', lineHeight: 1 }}>{loading ? '—' : balance}</span>
              <span style={{ fontSize: 13, color: 'var(--fg-3)' }}>tokens left</span>
              <Chip tone={isSubscriber ? 'live' : 'neutral'}>{TIER_LABEL[tier] || 'Free'}</Chip>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--fg-3)', marginTop: 6 }}>
              {loading ? 'Loading…'
                : isSubscriber ? `Refills to ${monthly} tokens each billing month.`
                : 'Asset generation costs 3 tokens; smaller AI helpers cost 1. Subscribe for a monthly refill.'}
            </div>
          </div>
          {isSubscriber && (
            <button onClick={() => go('/api/billing/portal', 'portal')} disabled={!!busy} style={{ ...ghostBtn, opacity: busy ? 0.6 : 1 }}>{busy === 'portal' ? 'Opening…' : 'Manage subscription'}</button>
          )}
        </div>
        {error && <div style={{ marginTop: 12, fontSize: 12.5, color: 'var(--destructive)' }}>{error}</div>}
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        {BILLING_TIERS.map((t) => {
          const current = tier === t.id;
          return (
            <div key={t.id} style={{ padding: 22, borderRadius: 16, background: 'var(--surface-1)', boxShadow: t.featured ? 'inset 0 0 0 1.5px #000' : 'inset 0 0 0 1px var(--line)', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, color: '#000' }}>{t.name}</span>
                {t.featured && <Chip tone="live">Popular</Chip>}
                {current && <Chip tone="neutral">Current</Chip>}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28, color: '#000' }}>{t.price}</span>
                <span style={{ fontSize: 13, color: 'var(--fg-3)' }}>{t.period}</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--fg-1)', fontWeight: 600 }}>{t.tokens} tokens / month</div>
              <div style={{ fontSize: 12.5, color: 'var(--fg-3)', flex: 1 }}>{t.blurb}</div>
              <button
                onClick={() => go('/api/billing/checkout', 'checkout-' + t.id, { tier: t.id })}
                disabled={!!busy || current}
                style={{ ...(t.featured ? primaryBtn : ghostBtn), opacity: (busy || current) ? 0.6 : 1, cursor: current ? 'default' : 'pointer' }}
              >
                {current ? 'Current plan' : busy === 'checkout-' + t.id ? 'Starting…' : isSubscriber ? 'Switch to ' + t.name : 'Subscribe'}
              </button>
            </div>
          );
        })}
      </div>

      <div style={{ fontSize: 12, color: 'var(--fg-4)' }}>
        Every account starts with 20 free tokens. Unused tokens don’t roll over — each billing month resets to your plan’s allowance.
      </div>
    </div>
  );
};

const SETTINGS_NAV = [
  { id: 'account',      label: 'Account',         d: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></> },
  { id: 'billing',      label: 'Billing',         d: <><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></> },
  { id: 'workspace',    label: 'Workspace',       d: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></> },
  { id: 'fluid',        label: 'Fluid AI',        d: <><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" /></> },
  // Members and Plan/Billing hidden until those features exist.
  { id: 'integrations', label: 'Integrations',    d: <><path d="M6 3v12M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 9a9 9 0 0 1-9 9" /></> },
  { id: 'notifications',label: 'Notifications',   d: <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" /></> },
];

const SECTIONS = {
  account: SecAccount,
  billing: SecBilling,
  workspace: SecWorkspace,
  fluid: SecFluid,
  integrations: SecIntegrations,
  notifications: SecNotifications,
};

const DirA_Settings = () => {
  // The top-bar token pill can request a specific tab (e.g. Billing) before
  // navigating here; honor it once, then clear the flag.
  const initialTab = (typeof window !== 'undefined' && window.__fluidSettingsTab) || 'fluid';
  const [active, setActive] = useSetState(SECTIONS[initialTab] ? initialTab : 'fluid');
  React.useEffect(() => { if (typeof window !== 'undefined') delete window.__fluidSettingsTab; }, []);
  const ActiveSection = SECTIONS[active];
  return (
    <AShell activeNav="settings" breadcrumb={['Settings']}>
      <div style={{ height: '100%', overflowY: 'auto' }}>
        <div style={{ display: 'flex', gap: 0, minHeight: '100%' }}>

          {/* Settings sub-nav */}
          <aside style={{
            width: 244, flex: '0 0 244px', borderRight: '1px solid var(--line)',
            padding: '44px 16px', position: 'sticky', top: 0, alignSelf: 'flex-start',
          }}>
            <div className="eyebrow" style={{ color: 'var(--fg-4)', padding: '0 12px', marginBottom: 16 }}>Settings</div>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {SETTINGS_NAV.map((it) => {
                const on = active === it.id;
                return (
                  <button key={it.id} onClick={() => setActive(it.id)} style={{
                    display: 'flex', alignItems: 'center', gap: 11, padding: '10px 12px', borderRadius: 10,
                    background: on ? 'var(--bg-elev)' : 'transparent',
                    boxShadow: on ? 'var(--shadow-xs), inset 0 0 0 1px var(--line)' : 'none',
                    color: on ? 'var(--fg-1)' : 'var(--fg-3)',
                    fontSize: 13.5, fontWeight: on ? 600 : 500, cursor: 'pointer', textAlign: 'left',
                    transition: 'background .15s, color .15s',
                  }}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ flex: '0 0 17px', opacity: on ? 1 : 0.8 }}>{it.d}</svg>
                    {it.label}
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Active section */}
          <div style={{ flex: 1, minWidth: 0, padding: '44px 56px 56px', maxWidth: 840 }}>
            <ActiveSection />
          </div>
        </div>
      </div>
    </AShell>
  );
};

Object.assign(window, { DirA_Settings });

// ------------------------------------------------------------------
// 10-router
// ------------------------------------------------------------------
// =====================================================================
// Fluid Prototype Router
//
// Threads every existing screen (Home · Brands · Assets · Guides ·
// Settings · the 5-step brand-creation wizard · the finalised Kit) into
// one interactive prototype.
//
// Strategy: every existing screen JSX is reused verbatim. Navigation is
// wired through a single global click delegate that interprets:
//   • Left-rail icon clicks  → root sections
//   • Top-dock wordmark      → Home
//   • Header breadcrumbs     → parent route
//   • Wizard dock buttons    → Continue / Back
//   • Known CTA copy         → matching destination
//   • Any [data-route]       → explicit override
// This avoids rewriting any of the existing screens.
// =====================================================================

const PR = {};
PR.useState = React.useState;
PR.useEffect = React.useEffect;
PR.useCallback = React.useCallback;
PR.createContext = React.createContext;
PR.useContext = React.useContext;

// All known routes. Determines whether a route string is valid.
const ROUTES = [
  'home', 'brands', 'brands-empty', 'assets', 'guides', 'settings',
  'step1', 'step2', 'step3', 'step4', 'step5',
];

// Left rail label → route.  The rail labels are rendered by the existing
// AShell, so we match by exact text.
const RAIL_TO_ROUTE = {
  'Home':     'home',
  'Brands':   'brands',
  'Assets':   'assets',
  'Guides':   'guides',
  'Settings': 'settings',
};

// Wizard linear flow
const WIZARD_NEXT = { step1:'step2', step2:'step3', step3:'step4', step4:'step5', step5:'brands' };
const WIZARD_PREV = { step2:'step1', step3:'step2', step4:'step3', step5:'step4' };

// Each screen's matching activeNav highlight + breadcrumb override.
const ROUTE_META = {
  'home':         { activeNav: 'home',     breadcrumb: ['Home'] },
  'brands':       { activeNav: 'brands',   breadcrumb: ['Brands'] },
  'brands-empty': { activeNav: 'brands',   breadcrumb: ['Brands'] },
  'assets':       { activeNav: 'assets',   breadcrumb: ['Assets'] },
  'guides':       { activeNav: 'guides',   breadcrumb: ['Guides'] },
  'settings':     { activeNav: 'settings', breadcrumb: ['Settings'] },
  'step1':        { activeNav: 'brands',   breadcrumb: ['Brands', 'New brand'] },
  'step2':        { activeNav: 'brands',   breadcrumb: ['Brands', 'New brand'] },
  'step3':        { activeNav: 'brands',   breadcrumb: ['Brands', 'New brand'] },
  'step4':        { activeNav: 'brands',   breadcrumb: ['Brands', 'New brand'] },
  'step5':        { activeNav: 'brands',   breadcrumb: ['Brands', 'Brand kit'] },
};

// Crumb label → route the user expects to land on when clicking it.
const CRUMB_TO_ROUTE = {
  'Home':      'home',
  'Brands':    'brands',
  'Assets':    'assets',
  'Guides':    'guides',
  'Settings':  'settings',
  // Inside the wizard, clicking 'New brand' bounces to step1.
  'New brand': 'step1',
};

// ---------------------------------------------------------------------
// Resolve a click → destination route.
// Walks the DOM from the click target up. Returns either a route string
// or null. Mutates `out` with a small hint so we can show a toast for
// non-routing CTAs like "Export kit".
// ---------------------------------------------------------------------
function resolveClick(target, currentRoute, out) {
  // 1) Fluid wordmark in the top dock — always goes Home.
  if (target.closest && target.closest('.fl-wordmark')) return 'home';

  // 2) Breadcrumb spans inside <header><nav>.
  const crumb = target.closest && target.closest('header > nav > span');
  if (crumb) {
    const t = (crumb.textContent || '').trim();
    if (CRUMB_TO_ROUTE[t]) return CRUMB_TO_ROUTE[t];
  }

  // 3) Left-rail icons. Each ARailIcon is a direct child <div> of <aside>.
  const aside = target.closest && target.closest('aside');
  if (aside) {
    for (const child of aside.children) {
      if (child.contains(target)) {
        const span = child.querySelector('span');
        const label = span && (span.textContent || '').trim();
        if (label && RAIL_TO_ROUTE[label]) return RAIL_TO_ROUTE[label];
      }
    }
  }

  // 4) Walk up looking for any cursor:pointer node — that's our clickable.
  //    Read its trimmed text and match against the known CTA vocabulary.
  let node = target;
  while (node && node !== document.body) {
    if (node.nodeType === 1) {
      // Explicit override — any element can opt-in.
      if (node.dataset && node.dataset.route) return node.dataset.route;

      const cs = node.ownerDocument.defaultView.getComputedStyle(node);
      if (cs.cursor === 'pointer') {
        const text = (node.textContent || '').replace(/\s+/g, ' ').trim();
        const r = matchCtaText(text, currentRoute, out);
        if (r) return r;
        // First cursor:pointer ancestor wins — if it doesn't match, stop.
        // Otherwise we'd accidentally bubble to outer cards.
        return null;
      }
    }
    node = node.parentElement;
  }
  return null;
}

function matchCtaText(text, currentRoute, out) {
  if (!text) return null;

  // Wizard dock — Back / Continue.
  if (text === 'Back')                           return WIZARD_PREV[currentRoute] || null;
  if (/^Continue to Style$/.test(text))          return 'step2';
  if (/^Continue to Name$/.test(text))           return 'step3';
  if (/^Continue to Logo$/.test(text))           return 'step4';
  if (text === 'Assemble Brand Kit')             return 'step5';
  if (/^Continue\b/.test(text))                  return WIZARD_NEXT[currentRoute] || null;

  // Top-level CTAs from Home / Brands.
  if (text.includes('Start a new brand'))        return 'step1';
  if (text === 'Browse templates'
   || text === 'Browse template library')        return 'brands-empty';
  if (/^Resume [A-Z]/.test(text))                return 'step4';
  if (text === 'All brands' || text === 'All brands →') return 'brands';
  if (text === '+ New brand' || text === 'New brand') return 'step1';

  // Kit screen secondary actions.
  if (text === 'Iterate')                        return 'step4';
  if (text === 'Export kit' || text === 'Share read-only'
   || text === 'Download all') { out.toast = text + ' — coming soon'; return null; }

  // Home quick paths — each card ends in "Start" + arrow.
  if (/ Start$/.test(text)) {
    if (/^Rebranding\b/.test(text)) return 'step1';
    if (/^Logo\b/.test(text))       return 'step1';
    if (/^Name\b/.test(text))       return 'step1';
    if (/^Guidelines\b/.test(text)) return 'step1';
  }

  // BrandsActive — brand cards open the kit.
  if (/^(Apple|Figma|Perplexity|Tesla|Cadence|Linear|Notion|Arc|Vercel|Stripe)\b/.test(text)
   && currentRoute === 'brands') {
    return 'step5';
  }

  return null;
}

// ---------------------------------------------------------------------
// Tiny toast for non-routing CTAs.
// ---------------------------------------------------------------------
function makeToast(msg) {
  let host = document.getElementById('proto-toast-host');
  if (!host) {
    host = document.createElement('div');
    host.id = 'proto-toast-host';
    document.body.appendChild(host);
  }
  const el = document.createElement('div');
  el.className = 'proto-toast';
  el.textContent = msg;
  host.appendChild(el);
  // Force reflow → animate in
  void el.offsetWidth;
  el.classList.add('show');
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 260);
  }, 2200);
}

// ---------------------------------------------------------------------
// Router provider
// ---------------------------------------------------------------------
const RouterCtx = PR.createContext(null);
const useRouter = () => PR.useContext(RouterCtx);

function RouterProvider({ children }) {
  const [route, setRoute] = PR.useState(() => {
    const h = (location.hash || '').slice(1);
    return ROUTES.includes(h) ? h : 'home';
  });
  const [direction, setDirection] = PR.useState('fwd');
  const routeRef = React.useRef(route);
  PR.useEffect(() => { routeRef.current = route; }, [route]);

  const ORDER = ['home','brands','step1','step2','step3','step4','step5','assets','guides','settings','brands-empty'];

  const navigate = PR.useCallback((next) => {
    if (!ROUTES.includes(next)) return;
    setDirection(ORDER.indexOf(next) >= ORDER.indexOf(routeRef.current) ? 'fwd' : 'back');
    setRoute(next);
    history.replaceState(null, '', '#' + next);
  }, []);

  // Global click delegate
  PR.useEffect(() => {
    function handler(e) {
      const out = {};
      const dest = resolveClick(e.target, routeRef.current, out);
      if (dest) {
        e.preventDefault();
        e.stopPropagation();
        navigate(dest);
      } else if (out.toast) {
        e.preventDefault();
        e.stopPropagation();
        makeToast(out.toast);
      }
    }
    document.addEventListener('click', handler, true);
    // Hash listener (back/forward buttons)
    function onHash() {
      const h = (location.hash || '').slice(1);
      if (ROUTES.includes(h) && h !== routeRef.current) {
        setDirection(ORDER.indexOf(h) >= ORDER.indexOf(routeRef.current) ? 'fwd' : 'back');
        setRoute(h);
      }
    }
    window.addEventListener('hashchange', onHash);
    return () => {
      document.removeEventListener('click', handler, true);
      window.removeEventListener('hashchange', onHash);
    };
  }, [navigate]);

  // Keyboard: ESC to step back through the wizard.
  PR.useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') {
        const prev = WIZARD_PREV[routeRef.current];
        if (prev) navigate(prev);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);

  return React.createElement(
    RouterCtx.Provider,
    { value: { route, navigate, direction } },
    children
  );
}

// Expose
window.RouterProvider = RouterProvider;
window.useRouter = useRouter;
window.ROUTE_META = ROUTE_META;
window.makeProtoToast = makeToast;

// ------------------------------------------------------------------
// 11-tweaks
// ------------------------------------------------------------------
// @ds-adherence-ignore -- omelette starter scaffold (raw elements/hex/px by design)

/* BEGIN USAGE */
// tweaks-panel.jsx
// Reusable Tweaks shell + form-control helpers.
// Exports (to window): useTweaks, TweaksPanel, TweakSection, TweakRow, TweakSlider,
//   TweakToggle, TweakRadio, TweakSelect, TweakText, TweakNumber, TweakColor, TweakButton.
//
// Owns the host protocol (listens for __activate_edit_mode / __deactivate_edit_mode,
// posts __edit_mode_available / __edit_mode_set_keys / __edit_mode_dismissed) so
// individual prototypes don't re-roll it. Ships a consistent set of controls so you
// don't hand-draw <input type="range">, segmented radios, steppers, etc.
//
// Usage (in an HTML file that loads React + Babel):
//
//   const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
//     "primaryColor": "#D97757",
//     "palette": ["#D97757", "#29261b", "#f6f4ef"],
//     "fontSize": 16,
//     "density": "regular",
//     "dark": false
//   }/*EDITMODE-END*/;
//
//   function App() {
//     const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
//     return (
//       <div style={{ fontSize: t.fontSize, color: t.primaryColor }}>
//         Hello
//         <TweaksPanel>
//           <TweakSection label="Typography" />
//           <TweakSlider label="Font size" value={t.fontSize} min={10} max={32} unit="px"
//                        onChange={(v) => setTweak('fontSize', v)} />
//           <TweakRadio  label="Density" value={t.density}
//                        options={['compact', 'regular', 'comfy']}
//                        onChange={(v) => setTweak('density', v)} />
//           <TweakSection label="Theme" />
//           <TweakColor  label="Primary" value={t.primaryColor}
//                        options={['#D97757', '#2A6FDB', '#1F8A5B', '#7A5AE0']}
//                        onChange={(v) => setTweak('primaryColor', v)} />
//           <TweakColor  label="Palette" value={t.palette}
//                        options={[['#D97757', '#29261b', '#f6f4ef'],
//                                  ['#475569', '#0f172a', '#f1f5f9']]}
//                        onChange={(v) => setTweak('palette', v)} />
//           <TweakToggle label="Dark mode" value={t.dark}
//                        onChange={(v) => setTweak('dark', v)} />
//         </TweaksPanel>
//       </div>
//     );
//   }
//
// TweakRadio is the segmented control for 2–3 short options (auto-falls-back to
// TweakSelect past ~16/~10 chars per label); reach for TweakSelect directly when
// options are many or long. For color tweaks always curate 3-4 options rather than
// a free picker; an option can also be a whole 2–5 color palette (the stored value
// is the array). The Tweak* controls are a floor, not a ceiling — build custom
// controls inside the panel if a tweak calls for UI they don't cover.
/* END USAGE */
// ─────────────────────────────────────────────────────────────────────────────

const __TWEAKS_STYLE = `
  .twk-panel{position:fixed;right:16px;bottom:16px;z-index:2147483646;width:280px;
    max-height:calc(100vh - 32px);display:flex;flex-direction:column;
    transform:scale(var(--dc-inv-zoom,1));transform-origin:bottom right;
    background:rgba(250,249,247,.78);color:#29261b;
    -webkit-backdrop-filter:blur(24px) saturate(160%);backdrop-filter:blur(24px) saturate(160%);
    border:.5px solid rgba(255,255,255,.6);border-radius:14px;
    box-shadow:0 1px 0 rgba(255,255,255,.5) inset,0 12px 40px rgba(0,0,0,.18);
    font:11.5px/1.4 ui-sans-serif,system-ui,-apple-system,sans-serif;overflow:hidden}
  .twk-hd{display:flex;align-items:center;justify-content:space-between;
    padding:10px 8px 10px 14px;cursor:move;user-select:none}
  .twk-hd b{font-size:12px;font-weight:600;letter-spacing:.01em}
  .twk-x{appearance:none;border:0;background:transparent;color:rgba(41,38,27,.55);
    width:22px;height:22px;border-radius:6px;cursor:default;font-size:13px;line-height:1}
  .twk-x:hover{background:rgba(0,0,0,.06);color:#29261b}
  .twk-body{padding:2px 14px 14px;display:flex;flex-direction:column;gap:10px;
    overflow-y:auto;overflow-x:hidden;min-height:0;
    scrollbar-width:thin;scrollbar-color:rgba(0,0,0,.15) transparent}
  .twk-body::-webkit-scrollbar{width:8px}
  .twk-body::-webkit-scrollbar-track{background:transparent;margin:2px}
  .twk-body::-webkit-scrollbar-thumb{background:rgba(0,0,0,.15);border-radius:4px;
    border:2px solid transparent;background-clip:content-box}
  .twk-body::-webkit-scrollbar-thumb:hover{background:rgba(0,0,0,.25);
    border:2px solid transparent;background-clip:content-box}
  .twk-row{display:flex;flex-direction:column;gap:5px}
  .twk-row-h{flex-direction:row;align-items:center;justify-content:space-between;gap:10px}
  .twk-lbl{display:flex;justify-content:space-between;align-items:baseline;
    color:rgba(41,38,27,.72)}
  .twk-lbl>span:first-child{font-weight:500}
  .twk-val{color:rgba(41,38,27,.5);font-variant-numeric:tabular-nums}

  .twk-sect{font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;
    color:rgba(41,38,27,.45);padding:10px 0 0}
  .twk-sect:first-child{padding-top:0}

  .twk-field{appearance:none;box-sizing:border-box;width:100%;min-width:0;height:26px;padding:0 8px;
    border:.5px solid rgba(0,0,0,.1);border-radius:7px;
    background:rgba(255,255,255,.6);color:inherit;font:inherit;outline:none}
  .twk-field:focus{border-color:rgba(0,0,0,.25);background:rgba(255,255,255,.85)}
  select.twk-field{padding-right:22px;
    background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path fill='rgba(0,0,0,.5)' d='M0 0h10L5 6z'/></svg>");
    background-repeat:no-repeat;background-position:right 8px center}

  .twk-slider{appearance:none;-webkit-appearance:none;width:100%;height:4px;margin:6px 0;
    border-radius:999px;background:rgba(0,0,0,.12);outline:none}
  .twk-slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;
    width:14px;height:14px;border-radius:50%;background:#fff;
    border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:default}
  .twk-slider::-moz-range-thumb{width:14px;height:14px;border-radius:50%;
    background:#fff;border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:default}

  .twk-seg{position:relative;display:flex;padding:2px;border-radius:8px;
    background:rgba(0,0,0,.06);user-select:none}
  .twk-seg-thumb{position:absolute;top:2px;bottom:2px;border-radius:6px;
    background:rgba(255,255,255,.9);box-shadow:0 1px 2px rgba(0,0,0,.12);
    transition:left .15s cubic-bezier(.3,.7,.4,1),width .15s}
  .twk-seg.dragging .twk-seg-thumb{transition:none}
  .twk-seg button{appearance:none;position:relative;z-index:1;flex:1;border:0;
    background:transparent;color:inherit;font:inherit;font-weight:500;min-height:22px;
    border-radius:6px;cursor:default;padding:4px 6px;line-height:1.2;
    overflow-wrap:anywhere}

  .twk-toggle{position:relative;width:32px;height:18px;border:0;border-radius:999px;
    background:rgba(0,0,0,.15);transition:background .15s;cursor:default;padding:0}
  .twk-toggle[data-on="1"]{background:#34c759}
  .twk-toggle i{position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;
    background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform .15s}
  .twk-toggle[data-on="1"] i{transform:translateX(14px)}

  .twk-num{display:flex;align-items:center;box-sizing:border-box;min-width:0;height:26px;padding:0 0 0 8px;
    border:.5px solid rgba(0,0,0,.1);border-radius:7px;background:rgba(255,255,255,.6)}
  .twk-num-lbl{font-weight:500;color:rgba(41,38,27,.6);cursor:ew-resize;
    user-select:none;padding-right:8px}
  .twk-num input{flex:1;min-width:0;height:100%;border:0;background:transparent;
    font:inherit;font-variant-numeric:tabular-nums;text-align:right;padding:0 8px 0 0;
    outline:none;color:inherit;-moz-appearance:textfield}
  .twk-num input::-webkit-inner-spin-button,.twk-num input::-webkit-outer-spin-button{
    -webkit-appearance:none;margin:0}
  .twk-num-unit{padding-right:8px;color:rgba(41,38,27,.45)}

  .twk-btn{appearance:none;height:26px;padding:0 12px;border:0;border-radius:7px;
    background:rgba(0,0,0,.78);color:#fff;font:inherit;font-weight:500;cursor:default}
  .twk-btn:hover{background:rgba(0,0,0,.88)}
  .twk-btn.secondary{background:rgba(0,0,0,.06);color:inherit}
  .twk-btn.secondary:hover{background:rgba(0,0,0,.1)}

  .twk-swatch{appearance:none;-webkit-appearance:none;width:56px;height:22px;
    border:.5px solid rgba(0,0,0,.1);border-radius:6px;padding:0;cursor:default;
    background:transparent;flex-shrink:0}
  .twk-swatch::-webkit-color-swatch-wrapper{padding:0}
  .twk-swatch::-webkit-color-swatch{border:0;border-radius:5.5px}
  .twk-swatch::-moz-color-swatch{border:0;border-radius:5.5px}

  .twk-chips{display:flex;gap:6px}
  .twk-chip{position:relative;appearance:none;flex:1;min-width:0;height:46px;
    padding:0;border:0;border-radius:6px;overflow:hidden;cursor:default;
    box-shadow:0 0 0 .5px rgba(0,0,0,.12),0 1px 2px rgba(0,0,0,.06);
    transition:transform .12s cubic-bezier(.3,.7,.4,1),box-shadow .12s}
  .twk-chip:hover{transform:translateY(-1px);
    box-shadow:0 0 0 .5px rgba(0,0,0,.18),0 4px 10px rgba(0,0,0,.12)}
  .twk-chip[data-on="1"]{box-shadow:0 0 0 1.5px rgba(0,0,0,.85),
    0 2px 6px rgba(0,0,0,.15)}
  .twk-chip>span{position:absolute;top:0;bottom:0;right:0;width:34%;
    display:flex;flex-direction:column;box-shadow:-1px 0 0 rgba(0,0,0,.1)}
  .twk-chip>span>i{flex:1;box-shadow:0 -1px 0 rgba(0,0,0,.1)}
  .twk-chip>span>i:first-child{box-shadow:none}
  .twk-chip svg{position:absolute;top:6px;left:6px;width:13px;height:13px;
    filter:drop-shadow(0 1px 1px rgba(0,0,0,.3))}
`;

// ── useTweaks ───────────────────────────────────────────────────────────────
// Single source of truth for tweak values. setTweak persists via the host
// (__edit_mode_set_keys → host rewrites the EDITMODE block on disk).
function useTweaks(defaults) {
  const [values, setValues] = React.useState(defaults);
  // Accepts either setTweak('key', value) or setTweak({ key: value, ... }) so a
  // useState-style call doesn't write a "[object Object]" key into the persisted
  // JSON block.
  const setTweak = React.useCallback((keyOrEdits, val) => {
    const edits = typeof keyOrEdits === 'object' && keyOrEdits !== null
      ? keyOrEdits : { [keyOrEdits]: val };
    setValues((prev) => ({ ...prev, ...edits }));
    window.parent.postMessage({ type: '__edit_mode_set_keys', edits }, '*');
    // Same-window signal so in-page listeners (deck-stage rail thumbnails)
    // can react — the parent message only reaches the host, not peers.
    window.dispatchEvent(new CustomEvent('tweakchange', { detail: edits }));
  }, []);
  return [values, setTweak];
}

// ── TweaksPanel ─────────────────────────────────────────────────────────────
// Floating shell. Registers the protocol listener BEFORE announcing
// availability — if the announce ran first, the host's activate could land
// before our handler exists and the toolbar toggle would silently no-op.
// The close button posts __edit_mode_dismissed so the host's toolbar toggle
// flips off in lockstep; the host echoes __deactivate_edit_mode back which
// is what actually hides the panel.
function TweaksPanel({ title = 'Tweaks', children }) {
  const [open, setOpen] = React.useState(false);
  const dragRef = React.useRef(null);
  const offsetRef = React.useRef({ x: 16, y: 16 });
  const PAD = 16;

  const clampToViewport = React.useCallback(() => {
    const panel = dragRef.current;
    if (!panel) return;
    const w = panel.offsetWidth, h = panel.offsetHeight;
    const maxRight = Math.max(PAD, window.innerWidth - w - PAD);
    const maxBottom = Math.max(PAD, window.innerHeight - h - PAD);
    offsetRef.current = {
      x: Math.min(maxRight, Math.max(PAD, offsetRef.current.x)),
      y: Math.min(maxBottom, Math.max(PAD, offsetRef.current.y)),
    };
    panel.style.right = offsetRef.current.x + 'px';
    panel.style.bottom = offsetRef.current.y + 'px';
  }, []);

  React.useEffect(() => {
    if (!open) return;
    clampToViewport();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', clampToViewport);
      return () => window.removeEventListener('resize', clampToViewport);
    }
    const ro = new ResizeObserver(clampToViewport);
    ro.observe(document.documentElement);
    return () => ro.disconnect();
  }, [open, clampToViewport]);

  React.useEffect(() => {
    const onMsg = (e) => {
      const t = e?.data?.type;
      if (t === '__activate_edit_mode') setOpen(true);
      else if (t === '__deactivate_edit_mode') setOpen(false);
    };
    window.addEventListener('message', onMsg);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);

  const dismiss = () => {
    setOpen(false);
    window.parent.postMessage({ type: '__edit_mode_dismissed' }, '*');
  };

  const onDragStart = (e) => {
    const panel = dragRef.current;
    if (!panel) return;
    const r = panel.getBoundingClientRect();
    const sx = e.clientX, sy = e.clientY;
    const startRight = window.innerWidth - r.right;
    const startBottom = window.innerHeight - r.bottom;
    const move = (ev) => {
      offsetRef.current = {
        x: startRight - (ev.clientX - sx),
        y: startBottom - (ev.clientY - sy),
      };
      clampToViewport();
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  if (!open) return null;
  return (
    <>
      <style>{__TWEAKS_STYLE}</style>
      <div ref={dragRef} className="twk-panel" data-omelette-chrome=""
           style={{ right: offsetRef.current.x, bottom: offsetRef.current.y }}>
        <div className="twk-hd" onMouseDown={onDragStart}>
          <b>{title}</b>
          <button className="twk-x" aria-label="Close tweaks"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={dismiss}>✕</button>
        </div>
        <div className="twk-body">
          {children}
        </div>
      </div>
    </>
  );
}

// ── Layout helpers ──────────────────────────────────────────────────────────

function TweakSection({ label, children }) {
  return (
    <>
      <div className="twk-sect">{label}</div>
      {children}
    </>
  );
}

function TweakRow({ label, value, children, inline = false }) {
  return (
    <div className={inline ? 'twk-row twk-row-h' : 'twk-row'}>
      <div className="twk-lbl">
        <span>{label}</span>
        {value != null && <span className="twk-val">{value}</span>}
      </div>
      {children}
    </div>
  );
}

// ── Controls ────────────────────────────────────────────────────────────────

function TweakSlider({ label, value, min = 0, max = 100, step = 1, unit = '', onChange }) {
  return (
    <TweakRow label={label} value={`${value}${unit}`}>
      <input type="range" className="twk-slider" min={min} max={max} step={step}
             value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </TweakRow>
  );
}

function TweakToggle({ label, value, onChange }) {
  return (
    <div className="twk-row twk-row-h">
      <div className="twk-lbl"><span>{label}</span></div>
      <button type="button" className="twk-toggle" data-on={value ? '1' : '0'}
              role="switch" aria-checked={!!value}
              onClick={() => onChange(!value)}><i /></button>
    </div>
  );
}

function TweakRadio({ label, value, options, onChange }) {
  const trackRef = React.useRef(null);
  const [dragging, setDragging] = React.useState(false);
  // The active value is read by pointer-move handlers attached for the lifetime
  // of a drag — ref it so a stale closure doesn't fire onChange for every move.
  const valueRef = React.useRef(value);
  valueRef.current = value;

  // Segments wrap mid-word once per-segment width runs out. The track is
  // ~248px (280 panel − 28 body pad − 4 seg pad), each button loses 12px
  // to its own padding, and 11.5px system-ui averages ~6.3px/char — so 2
  // options fit ~16 chars each, 3 fit ~10. Past that (or >3 options), fall
  // back to a dropdown rather than wrap.
  const labelLen = (o) => String(typeof o === 'object' ? o.label : o).length;
  const maxLen = options.reduce((m, o) => Math.max(m, labelLen(o)), 0);
  const fitsAsSegments = maxLen <= ({ 2: 16, 3: 10 }[options.length] ?? 0);
  if (!fitsAsSegments) {
    // <select> emits strings — map back to the original option value so the
    // fallback stays type-preserving (numbers, booleans) like the segment path.
    const resolve = (s) => {
      const m = options.find((o) => String(typeof o === 'object' ? o.value : o) === s);
      return m === undefined ? s : typeof m === 'object' ? m.value : m;
    };
    return <TweakSelect label={label} value={value} options={options}
                        onChange={(s) => onChange(resolve(s))} />;
  }
  const opts = options.map((o) => (typeof o === 'object' ? o : { value: o, label: o }));
  const idx = Math.max(0, opts.findIndex((o) => o.value === value));
  const n = opts.length;

  const segAt = (clientX) => {
    const r = trackRef.current.getBoundingClientRect();
    const inner = r.width - 4;
    const i = Math.floor(((clientX - r.left - 2) / inner) * n);
    return opts[Math.max(0, Math.min(n - 1, i))].value;
  };

  const onPointerDown = (e) => {
    setDragging(true);
    const v0 = segAt(e.clientX);
    if (v0 !== valueRef.current) onChange(v0);
    const move = (ev) => {
      if (!trackRef.current) return;
      const v = segAt(ev.clientX);
      if (v !== valueRef.current) onChange(v);
    };
    const up = () => {
      setDragging(false);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <TweakRow label={label}>
      <div ref={trackRef} role="radiogroup" onPointerDown={onPointerDown}
           className={dragging ? 'twk-seg dragging' : 'twk-seg'}>
        <div className="twk-seg-thumb"
             style={{ left: `calc(2px + ${idx} * (100% - 4px) / ${n})`,
                      width: `calc((100% - 4px) / ${n})` }} />
        {opts.map((o) => (
          <button key={o.value} type="button" role="radio" aria-checked={o.value === value}>
            {o.label}
          </button>
        ))}
      </div>
    </TweakRow>
  );
}

function TweakSelect({ label, value, options, onChange }) {
  return (
    <TweakRow label={label}>
      <select className="twk-field" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => {
          const v = typeof o === 'object' ? o.value : o;
          const l = typeof o === 'object' ? o.label : o;
          return <option key={v} value={v}>{l}</option>;
        })}
      </select>
    </TweakRow>
  );
}

function TweakText({ label, value, placeholder, onChange }) {
  return (
    <TweakRow label={label}>
      <input className="twk-field" type="text" value={value} placeholder={placeholder}
             onChange={(e) => onChange(e.target.value)} />
    </TweakRow>
  );
}

function TweakNumber({ label, value, min, max, step = 1, unit = '', onChange }) {
  const clamp = (n) => {
    if (min != null && n < min) return min;
    if (max != null && n > max) return max;
    return n;
  };
  const startRef = React.useRef({ x: 0, val: 0 });
  const onScrubStart = (e) => {
    e.preventDefault();
    startRef.current = { x: e.clientX, val: value };
    const decimals = (String(step).split('.')[1] || '').length;
    const move = (ev) => {
      const dx = ev.clientX - startRef.current.x;
      const raw = startRef.current.val + dx * step;
      const snapped = Math.round(raw / step) * step;
      onChange(clamp(Number(snapped.toFixed(decimals))));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  return (
    <div className="twk-num">
      <span className="twk-num-lbl" onPointerDown={onScrubStart}>{label}</span>
      <input type="number" value={value} min={min} max={max} step={step}
             onChange={(e) => onChange(clamp(Number(e.target.value)))} />
      {unit && <span className="twk-num-unit">{unit}</span>}
    </div>
  );
}

// Relative-luminance contrast pick — checkmarks drawn over a swatch need to
// read on both #111 and #fafafa without per-option configuration. Hex input
// only (#rgb / #rrggbb); named or rgb()/hsl() colors fall through to "light".
function __twkIsLight(hex) {
  const h = String(hex).replace('#', '');
  const x = h.length === 3 ? h.replace(/./g, (c) => c + c) : h.padEnd(6, '0');
  const n = parseInt(x.slice(0, 6), 16);
  if (Number.isNaN(n)) return true;
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return r * 299 + g * 587 + b * 114 > 148000;
}

const __TwkCheck = ({ light }) => (
  <svg viewBox="0 0 14 14" aria-hidden="true">
    <path d="M3 7.2 5.8 10 11 4.2" fill="none" strokeWidth="2.2"
          strokeLinecap="round" strokeLinejoin="round"
          stroke={light ? 'rgba(0,0,0,.78)' : '#fff'} />
  </svg>
);

// TweakColor — curated color/palette picker. Each option is either a single
// hex string or an array of 1-5 hex strings; the card adapts — a lone color
// renders solid, a palette renders colors[0] as the hero (left ~2/3) with the
// rest stacked in a sharp column on the right. onChange emits the
// option in the shape it was passed (string stays string, array stays array).
// Without options it falls back to the native color input for back-compat.
function TweakColor({ label, value, options, onChange }) {
  if (!options || !options.length) {
    return (
      <div className="twk-row twk-row-h">
        <div className="twk-lbl"><span>{label}</span></div>
        <input type="color" className="twk-swatch" value={value}
               onChange={(e) => onChange(e.target.value)} />
      </div>
    );
  }
  // Native <input type=color> emits lowercase hex per the HTML spec, so
  // compare case-insensitively. String() guards JSON.stringify(undefined),
  // which returns the primitive undefined (no .toLowerCase).
  const key = (o) => String(JSON.stringify(o)).toLowerCase();
  const cur = key(value);
  return (
    <TweakRow label={label}>
      <div className="twk-chips" role="radiogroup">
        {options.map((o, i) => {
          const colors = Array.isArray(o) ? o : [o];
          const [hero, ...rest] = colors;
          const sup = rest.slice(0, 4);
          const on = key(o) === cur;
          return (
            <button key={i} type="button" className="twk-chip" role="radio"
                    aria-checked={on} data-on={on ? '1' : '0'}
                    aria-label={colors.join(', ')} title={colors.join(' · ')}
                    style={{ background: hero }}
                    onClick={() => onChange(o)}>
              {sup.length > 0 && (
                <span>
                  {sup.map((c, j) => <i key={j} style={{ background: c }} />)}
                </span>
              )}
              {on && <__TwkCheck light={__twkIsLight(hero)} />}
            </button>
          );
        })}
      </div>
    </TweakRow>
  );
}

function TweakButton({ label, onClick, secondary = false }) {
  return (
    <button type="button" className={secondary ? 'twk-btn secondary' : 'twk-btn'}
            onClick={onClick}>{label}</button>
  );
}

Object.assign(window, {
  useTweaks, TweaksPanel, TweakSection, TweakRow,
  TweakSlider, TweakToggle, TweakRadio, TweakSelect,
  TweakText, TweakNumber, TweakColor, TweakButton,
});

// ------------------------------------------------------------------
// 12-bootstrap
// ------------------------------------------------------------------

// Default brand accent + prototype tweaks (persisted by useTweaks).
const PROTO_DEFAULTS = /*EDITMODE-BEGIN*/{
  "brand": "Signature",
  "showQuickJump": true
}/*EDITMODE-END*/;

const BRAND_TO_ATTR = { Signature: '', Rare: 'rare', Solid: 'solid' };
const BRAND_NOTE = {
  Signature: 'Signature treatment — the gradient appears in the wordmark, the app icon and across decorative accents.',
  Rare:      'Rare — the gradient is kept only as the app-icon signature; the wordmark and every accent go quiet and monochrome.',
  Solid:     'Solid — a single proprietary accent (coral) replaces the rainbow everywhere but the app-icon signature.',
};

// Resolve current route → screen component.
const SCREEN_FOR_ROUTE = {
  'home':         () => <DirA_Home />,
  'brands':       () => <DirA_BrandsActive />,
  'brands-empty': () => <DirA_Brands />,        // the editorial empty-state library
  'assets':       () => <DirA_AssetsScreen />,
  'guides':       () => <DirA_GuidesScreen />,
  'settings':     () => <DirA_Settings />,
  'step1':        () => <DirA_Step1_Brief />,
  'step2':        () => <DirA_Step2_Style />,
  'step3':        () => <DirA_Step3_Name />,
  'step4':        () => <DirA_Step4_Logo />,
  'step5':        () => <DirA_KitSummary />,
};

// The actual prototype frame — reads route, renders the matching screen
// keyed by route so the entrance animation re-runs on every change.
function PrototypeFrame() {
  const { route } = useRouter();
  const Screen = SCREEN_FOR_ROUTE[route] || SCREEN_FOR_ROUTE['home'];
  return (
    <div className="proto-screen" key={route}>
      <Screen />
    </div>
  );
}

// Quick-jump pill — minimal in-prototype controller. Lets us land on any
// screen for review without going through the click chain. The router
// drives this; the existing CTAs still work as the primary navigation.
function QuickJump() {
  const { route, navigate } = useRouter();
  const [open, setOpen] = useState(false);
  const routes = [
    { id: 'home',         label: 'Home' },
    { id: 'brands',       label: 'Brands' },
    { id: 'brands-empty', label: 'Empty library' },
    { id: 'assets',       label: 'Assets' },
    { id: 'guides',       label: 'Guides' },
    { id: 'settings',     label: 'Settings' },
    { id: 'step1',        label: 'Wizard · 1 Brief' },
    { id: 'step2',        label: 'Wizard · 2 Style' },
    { id: 'step3',        label: 'Wizard · 3 Name' },
    { id: 'step4',        label: 'Wizard · 4 Logo' },
    { id: 'step5',        label: 'Brand kit' },
  ];
  return (
    <>
      <div className="proto-jump" onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}>
        <span className="dot" />
        <span>{route.replace('-', ' ')}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 2, opacity: 0.6, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed', right: 18, bottom: 56, zIndex: 51,
            background: '#0E0F12', color: '#fff', borderRadius: 14,
            padding: 6, minWidth: 220,
            boxShadow: '0 24px 50px rgba(0,0,0,.30), inset 0 1px 0 rgba(255,255,255,.06)',
            fontFamily: 'var(--font-body)',
            animation: 'protoIn 240ms var(--ease-out)',
          }}
        >
          {routes.map((r) => {
            const active = r.id === route;
            return (
              <div
                key={r.id}
                onClick={() => { navigate(r.id); setOpen(false); }}
                style={{
                  padding: '8px 12px', borderRadius: 10, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  fontSize: 12.5, fontWeight: active ? 700 : 500,
                  color: active ? '#fff' : 'rgba(255,255,255,.72)',
                  background: active ? 'rgba(255,255,255,.10)' : 'transparent',
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,.06)'; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
              >
                <span>{r.label}</span>
                {active && (
                  <span style={{ width: 6, height: 6, borderRadius: 99, background: 'var(--fl-accent)' }} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════
// Brand persistence (Phase 2b) — talks to /api/brands, holds the current
// draft, and autosaves as the user moves through the wizard.
// ══════════════════════════════════════════════════════════════════════
async function apiListBrands() {
  try {
    const r = await fetch('/api/brands', { cache: 'no-store' });
    if (!r.ok) return [];
    return (await r.json()).brands || [];
  } catch { return []; }
}
async function apiCreateBrand(body) {
  try {
    const r = await fetch('/api/brands', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}),
    });
    if (!r.ok) return null;
    return (await r.json()).brand;
  } catch { return null; }
}
async function apiUpdateBrand(id, patch) {
  try {
    const r = await fetch('/api/brands/' + id, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (!r.ok) return null;
    return (await r.json()).brand;
  } catch { return null; }
}
async function apiDeleteBrand(id) {
  try {
    const r = await fetch('/api/brands/' + id, { method: 'DELETE' });
    return r.ok;
  } catch { return false; }
}
// Any token-spending request may have changed the balance (spent on success,
// or hit zero on a 402). Nudge the provider to re-read it for the top-bar pill,
// and raise a distinct signal when the request was refused for lack of tokens
// so the app can surface a single actionable "top up" banner.
function signalBalanceChanged(code) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event('fluid:balance-changed'));
  if (code === 'no_tokens') window.dispatchEvent(new Event('fluid:no-tokens'));
}

// Phase 3 — inline AI assists (rewrite brief, suggest audience/competitors,
// pick a Step 2 option). Returns { result } or { error, code }.
async function apiAssist(brandId, task, options) {
  try {
    const r = await fetch('/api/generate/assist', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brandId, task, options }),
    });
    const j = await r.json().catch(() => ({}));
    signalBalanceChanged(j.code);
    if (!r.ok) return { error: j.error || 'Assist failed.', code: j.code };
    return { result: j.result || {} };
  } catch { return { error: 'Network error.' }; }
}
// Phase 3 — ask Claude for name candidates for this brand. Resolves to
// { names } on success or { error } so the caller can show a message.
async function apiGenerateNames(brandId) {
  try {
    const r = await fetch('/api/generate/names', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brandId }),
    });
    const j = await r.json().catch(() => ({}));
    signalBalanceChanged(j.code);
    if (!r.ok) return { error: j.error || 'Generation failed.', code: j.code };
    return { names: j.names || [] };
  } catch { return { error: 'Network error.' }; }
}
// Phase 3 — ask Claude for a color palette for this brand.
async function apiGeneratePalette(brandId) {
  try {
    const r = await fetch('/api/generate/palette', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brandId }),
    });
    const j = await r.json().catch(() => ({}));
    signalBalanceChanged(j.code);
    if (!r.ok) return { error: j.error || 'Generation failed.', code: j.code };
    return { palette: j.palette || null };
  } catch { return { error: 'Network error.' }; }
}
// Phase 3 — ask Claude for a typography pairing for this brand.
async function apiGenerateTypography(brandId) {
  try {
    const r = await fetch('/api/generate/typography', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brandId }),
    });
    const j = await r.json().catch(() => ({}));
    signalBalanceChanged(j.code);
    if (!r.ok) return { error: j.error || 'Generation failed.', code: j.code };
    return { typography: j.typography || null };
  } catch { return { error: 'Network error.' }; }
}
// Phase 3 — ask Claude for SVG logo concepts for this brand.
async function apiGenerateLogos(brandId) {
  try {
    const r = await fetch('/api/generate/logo', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brandId }),
    });
    const j = await r.json().catch(() => ({}));
    signalBalanceChanged(j.code);
    if (!r.ok) return { error: j.error || 'Generation failed.', code: j.code };
    return { logos: j.logos || [] };
  } catch { return { error: 'Network error.' }; }
}
// Phase 3 — ask Claude to synthesize written brand guidelines.
async function apiGenerateGuidelines(brandId) {
  try {
    const r = await fetch('/api/generate/guidelines', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brandId }),
    });
    const j = await r.json().catch(() => ({}));
    signalBalanceChanged(j.code);
    if (!r.ok) return { error: j.error || 'Generation failed.', code: j.code };
    return { guidelines: j.guidelines || null };
  } catch { return { error: 'Network error.' }; }
}
// Render model-generated SVG safely: an <img> data-URI can't execute scripts,
// unlike innerHTML. The SVG is also sanitized server-side (defense in depth).
const SvgMark = ({ svg, size = 120, bg }) => (
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
function ensureGoogleFont(family) {
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
const FONT_FALLBACK = {
  'serif': 'Georgia, serif',
  'sans-serif': 'system-ui, sans-serif',
  'display': 'system-ui, sans-serif',
  'monospace': 'ui-monospace, monospace',
};

// ── Custom (user-uploaded) fonts ──────────────────────────────────────
function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
// Register an uploaded font with the browser via the FontFace API so previews
// render in it. Idempotent per family+source.
const _registeredFonts = new Set();
async function registerCustomFont(family, dataUrl) {
  if (typeof window === 'undefined' || typeof window.FontFace === 'undefined') return;
  const key = family + '|' + String(dataUrl).slice(0, 48);
  if (_registeredFonts.has(key)) return;
  try {
    const ff = new window.FontFace(family, 'url(' + dataUrl + ')');
    await ff.load();
    document.fonts.add(ff);
    _registeredFonts.add(key);
  } catch { /* unusable font file — preview just falls back */ }
}

// Until the name step is wired up, derive a readable brand name from the brief
// so saved brands don't all read "Untitled brand".
function deriveBrandName(brief) {
  const words = String(brief || '').trim().split(/\s+/).filter(Boolean).slice(0, 4);
  if (words.length === 0) return 'Untitled brand';
  const s = words.join(' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const BrandDraftCtx = React.createContext(null);
const useBrandDraft = () => React.useContext(BrandDraftCtx) || {};
window.useBrandDraft = useBrandDraft;

async function apiGetMe() {
  try {
    const r = await fetch('/api/me', { cache: 'no-store' });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

function BrandDraftProvider({ children }) {
  const { route } = useRouter();
  const [brands, setBrands] = React.useState([]);
  const [draft, setDraft] = React.useState(null);
  const [user, setUser] = React.useState(null);
  const [billing, setBilling] = React.useState(null); // { tier, balance, monthlyTokens }
  const draftRef = React.useRef(draft);
  draftRef.current = draft;
  const saveTimer = React.useRef(null);

  const refresh = React.useCallback(async () => {
    setBrands(await apiListBrands());
  }, []);
  React.useEffect(() => { refresh(); }, [refresh]);
  React.useEffect(() => { apiGetMe().then(setUser); }, []);

  // Token balance — shown in the top bar and refreshed after every generation.
  const refreshBalance = React.useCallback(async () => {
    try {
      const r = await fetch('/api/billing/status', { cache: 'no-store' });
      if (r.ok) setBilling(await r.json());
    } catch { /* keep the last known balance */ }
  }, []);
  React.useEffect(() => { refreshBalance(); }, [refreshBalance]);
  // Generation wrappers dispatch this after any token-spending request.
  React.useEffect(() => {
    const onChanged = () => refreshBalance();
    window.addEventListener('fluid:balance-changed', onChanged);
    return () => window.removeEventListener('fluid:balance-changed', onChanged);
  }, [refreshBalance]);

  // A request refused for lack of tokens raises a single "top up" banner.
  const [noTokens, setNoTokens] = React.useState(false);
  React.useEffect(() => {
    const onNoTokens = () => setNoTokens(true);
    window.addEventListener('fluid:no-tokens', onNoTokens);
    return () => window.removeEventListener('fluid:no-tokens', onNoTokens);
  }, []);

  // Debounced field autosave.
  const setField = React.useCallback((key, value) => {
    // Editing the brief also refreshes the derived brand name.
    const patch = key === 'brief'
      ? { brief: value, name: deriveBrandName(value) }
      : { [key]: value };
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
    const d = draftRef.current;
    if (!d || !d.id) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const updated = await apiUpdateBrand(d.id, patch);
      if (updated) refresh();
    }, 500);
  }, [refresh]);

  const startNew = React.useCallback(async () => {
    const b = await apiCreateBrand({ step: 1 });
    if (b) { setDraft(b); refresh(); }
    return b;
  }, [refresh]);

  const loadBrand = React.useCallback((id) => {
    const b = brands.find((x) => x.id === id);
    if (b) setDraft(b);
    return b;
  }, [brands]);

  // Clear the draft whenever we leave the wizard, so "Start a new brand"
  // always begins fresh (resume re-selects an explicit brand).
  React.useEffect(() => {
    if (!/^step[1-5]$/.test(route)) setDraft(null);
  }, [route]);

  // Create a draft when the brief screen opens with none active.
  React.useEffect(() => {
    if (route === 'step1' && !draftRef.current) startNew();
  }, [route, startNew]);

  // Persist wizard progress; mark the brand "live" at the kit.
  React.useEffect(() => {
    const d = draftRef.current;
    if (!d || !d.id || !/^step[1-5]$/.test(route)) return;
    const step = Number(route.slice(4));
    const patch = { step };
    if (route === 'step5') patch.status = 'live';
    apiUpdateBrand(d.id, patch).then((u) => { if (u) { setDraft(u); refresh(); } });
  }, [route]);

  const value = { brands, draft, user, billing, refreshBalance, setField, startNew, loadBrand, refresh };
  return (
    <BrandDraftCtx.Provider value={value}>
      {children}
      {noTokens && <NoTokensBanner onClose={() => setNoTokens(false)} />}
    </BrandDraftCtx.Provider>
  );
}
window.BrandDraftProvider = BrandDraftProvider;

function App() {
  const [t, setTweak] = useTweaks(PROTO_DEFAULTS);

  useEffect(() => {
    document.body.dataset.brand = BRAND_TO_ATTR[t.brand] || '';
  }, [t.brand]);

  return (
    <RouterProvider>
      <BrandDraftProvider>
      <PrototypeFrame />
      {t.showQuickJump && <QuickJump />}

      <TweaksPanel>
        <TweakSection label="Brand accent" />
        <TweakRadio
          label="Gradient use"
          value={t.brand}
          options={['Signature', 'Rare', 'Solid']}
          onChange={(v) => setTweak('brand', v)}
        />
        <div style={{ fontSize: 11.5, lineHeight: 1.5, color: '#8A8A90', padding: '2px 2px 6px' }}>
          {BRAND_NOTE[t.brand]}
        </div>

        <TweakSection label="Prototype" />
        <TweakToggle
          label="Quick-jump pill"
          value={t.showQuickJump}
          onChange={(v) => setTweak('showQuickJump', v)}
        />
        <div style={{ fontSize: 11.5, lineHeight: 1.5, color: '#8A8A90', padding: '2px 2px 6px' }}>
          Always-visible route switcher in the bottom-right. Off → navigate purely through the in-product CTAs and the left rail.
        </div>
      </TweaksPanel>
      </BrandDraftProvider>
    </RouterProvider>
  );
}



export default App;
