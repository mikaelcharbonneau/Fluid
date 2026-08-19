"use client";

// Extracted from the original single-file Prototype.tsx as part of #175's
// route split. The code below is unchanged; only the import/export header
// around it is new.

import React from "react";
import Image from "next/image";
import { CARD_BUTTON_RESET } from "./a11y";
import { __assets } from "./assets";

// =====================================================================
// Brand hero components — each one is a faithful rendering of the
// brand's visual register: real logomark, signature typography stack,
// and a recognizable UI/marketing element from that brand's surface.
// =====================================================================

// Apple's SF-style font stack actually renders as San Francisco on macOS.
export const APPLE_DISPLAY = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif";

// Helvetica Neue stands in for Tesla's Gotham on macOS — same modernist character.
export const TESLA_TYPE    = "'Helvetica Neue', 'Arial Narrow', Helvetica, Arial, sans-serif";

// Inter is the closest widely-available font to Whyte (Figma's display).
export const FIGMA_TYPE    = "'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";

// New York is the closest macOS serif to FK Display Pro's editorial register.
export const PERPLEXITY_DISPLAY = "'New York', 'Times New Roman', 'Tiempos Headline', Georgia, serif";

const PERPLEXITY_BODY    = "-apple-system, BlinkMacSystemFont, 'Söhne', 'Inter', sans-serif";

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
const BrandLogoImg = ({ brand, size = 48, radius, fill = false, style }: any) => (
  fill
    ? <Image src={(BRAND_LOGO_SRC as any)[brand]} alt={brand} draggable={false} fill sizes="120px"
        style={{ objectFit: 'cover', display: 'block', ...style }} />
    : <Image src={(BRAND_LOGO_SRC as any)[brand]} alt={brand} draggable={false} width={size} height={size}
        style={{ width: size, height: size, borderRadius: radius != null ? radius : Math.round(size * 0.22), objectFit: 'cover', display: 'block', ...style }} />
);

// ── Apple hero — brand identity sheet ─────────────────────────────────
// Centred premium composition. Logo, wordmark, "Hello." type specimen
// in three weights, and the product-finish color discs that read as
// purely Apple. Inspired by the Apple brand book + apple.com configurator.
export const AppleHero = () => {
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
export const FigmaHero = () => {
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
export const PerplexityHero = () => {
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
          &ldquo;Where curiosity becomes&nbsp;understanding.&rdquo;
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
export const TeslaHero = () => {
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
export const AInspirationCard = ({ name, category, style, hero, sel, onClick }: any) => (
  <button type="button" onClick={onClick} aria-pressed={!!sel} style={{
    ...CARD_BUTTON_RESET,
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
  </button>
);

export const VISUAL_STYLE_OPTIONS = [
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

