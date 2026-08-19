"use client";

// Extracted from the original single-file Prototype.tsx as part of #175's
// route split. The code below is unchanged; only the import/export header
// around it is new.

import React from "react";
import { CARD_BUTTON_RESET } from "../_kit/a11y";
import { FONT_FALLBACK, ensureGoogleFont } from "../_kit/brand";
import { AInspirationCard, APPLE_DISPLAY, AppleHero, FIGMA_TYPE, FigmaHero, PERPLEXITY_DISPLAY, PerplexityHero, TESLA_TYPE, TeslaHero, VISUAL_STYLE_OPTIONS } from "../_kit/brand-showcase";
import { AI_CHOICE } from "../_kit/logo-flow";
import { useState } from "../_kit/react";
import { Sparkle } from "../_kit/ui";
import { AWizardLayout } from "../_kit/wizard";
import { useBrandDraft } from "../_state/brand-draft-context";
import { useRouter } from "../_state/router-context";

// =====================================================================
// A3 · Step 4 · Style Selection Screen
// Two paths to choose a visual direction:
//   1. Start from an existing brand — inspiration cards showing the
//      whole identity (hero, palette, type, descriptor). 4 by default,
//      expandable.
//   2. Build it piece by piece — three sub-sections (Visual style,
//      Color palette, Typography), each with a "Let AI choose"
//      affordance. The visual-style sub-section also exposes refinement
//      sliders within the chosen register.
// =====================================================================

// Sparkle button — section-level "Let AI choose" affordance. Toggles the
// delegation on and off; `active` means the studio owns this decision.
const ALetAI = ({ onClick, active }: any) => (
  <button onClick={onClick} style={{
    display:'inline-flex', alignItems:'center', gap:6,
    padding:'6px 12px', borderRadius: 99,
    background: active ? 'rgba(253,186,80,.16)' : '#0E0F12',
    color: active ? '#8A5A12' : '#fff',
    boxShadow: active ? 'inset 0 0 0 1px rgba(253,186,80,.55)' : '0 1px 4px rgba(0,0,0,.18)',
    fontSize: 11.5, fontWeight: 600, border:0, cursor:'pointer',
  }}>
    <Sparkle size={11} color={active ? '#C77D14' : '#FDBA50'}/>
    {active ? 'Fluid decides' : 'Let AI choose'}
  </button>
);

// Shown under a section the client delegated. States plainly that the studio
// will decide from the brief rather than leaving the choice blank.
const ADelegatedNote = ({ what, onClear }: any) => (
  <div style={{
    display:'flex', alignItems:'center', gap:10, flexWrap:'wrap',
    padding:'10px 14px', borderRadius:12, marginBottom:12,
    background:'rgba(253,186,80,.10)', boxShadow:'inset 0 0 0 1px rgba(253,186,80,.35)',
    fontSize:12.5, color:'#8A5A12', lineHeight:1.45,
  }}>
    <span style={{flex:1, minWidth:200}}>
      Fluid will choose the {what} from your brief — it won’t be
      limited to the options below.
    </span>
    <button onClick={onClear} style={{
      padding:'5px 10px', borderRadius:8, border:0, cursor:'pointer',
      background:'transparent', color:'#8A5A12', fontSize:11.5, fontWeight:700,
      boxShadow:'inset 0 0 0 1px rgba(253,186,80,.55)',
    }}>Pick it myself</button>
  </div>
);

// Section heading: number badge + title + meta + AI button
const ASectionHead = ({ n, title, sub, count, ai, onAI, aiActive }: any) => (
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
      {ai && <ALetAI onClick={onAI} active={aiActive}/>}
    </div>
  </div>
);

// Bespoke style swatches — each a self-contained composition that telegraphs
// its register through type, color, scale and density (no literal UI screenshots).
const StyleSwatch = ({ id }: any) => {
  const tag = (text: any, color: any) => (
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

const AVisualStyleCard = ({ id, name, descriptor, sel, onClick }: any) => (
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
  const { draft, setData } = useBrandDraft();
  const step2 = (draft && draft.data && draft.data.step2) || {};
  const setStep2 = (patch: any) =>
    setData({ step2: { ...step2, ...patch } });
  return { step2, setStep2 };
};

// Expandable visual-style picker — collapsed: 4 direction cards only;
// expanded: cards + refinement sliders for the selected direction.
const AVisualStyleSection = () => {
  const { draft, setField } = useBrandDraft();
  const { step2, setStep2 } = useStep2();
  const [expanded, setExpanded] = useState(false);
  const [selectedId, setSelectedId] = useState((draft && draft.style_id) || null);
  const delegated = selectedId === AI_CHOICE;
  const selected = VISUAL_STYLE_OPTIONS.find((o) => o.id === selectedId) || VISUAL_STYLE_OPTIONS[0];
  const refine = step2.refine || { bold: 50, modern: 50, cool: 50 };
  const setRefine = (key: any, v: any) => setStep2({ refine: { ...refine, [key]: v } });
  // Delegating is instant and free — no model call. The decision is made later
  // by the studio from the completed brief.
  const letAIChoose = () => {
    const next = delegated ? null : AI_CHOICE;
    setSelectedId(next);
    setField('style_id', next);
  };

  return (
    <div style={{ marginBottom: 24 }}>
      <ASectionHead
        n="01"
        title="Visual style"
        sub="Each card is a full preview of that visual direction."
        ai onAI={letAIChoose} aiActive={delegated}
      />
      {delegated && <ADelegatedNote what="visual direction" onClear={letAIChoose} />}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, opacity: delegated ? 0.45 : 1 }}>
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
              {delegated ? 'Tune the register' : 'Refine within ' + selected.name}
            </span>
            <div style={{ flex: 1, height: 1, background: 'var(--line)' }}/>
            <span style={{ fontSize: 10.5, color: 'var(--fg-4)', fontFamily: 'var(--font-mono)' }}>3 attributes</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            <ASlider left="Quiet" right="Bold" value={refine.bold} onChange={(v: any) => setRefine('bold', v)} />
            <ASlider left="Classic" right="Modern" value={refine.modern} onChange={(v: any) => setRefine('modern', v)} />
            <ASlider left="Warm" right="Cool" value={refine.cool} onChange={(v: any) => setRefine('cool', v)} />
          </div>
        </div>
      )}
    </div>
  );
};

// Draggable refinement slider (native range input for reliable interaction).
const ASlider = ({ left, right, value, onChange }: any) => (
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
const APaletteOption = ({ name, mood, palette, sel, onClick }: any) => (
  <button type="button" onClick={onClick} aria-pressed={!!sel} style={{
    ...CARD_BUTTON_RESET,
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
      {palette.map((c: any, i: any) => (
        <div key={i} style={{flex: i === 0 ? 1.4 : 1, borderRadius: 6, background: c, boxShadow:'inset 0 0 0 1px rgba(0,0,0,0.06)'}}/>
      ))}
    </div>
    <div>
      <div style={{fontFamily:'var(--font-display)', fontSize: 13, fontWeight: 700, letterSpacing:'-0.015em', color:'var(--fg-1)'}}>{name}</div>
      <div style={{fontSize: 10.5, color:'var(--fg-3)', marginTop: 1}}>{mood}</div>
    </div>
  </button>
);

// Font pair option — display + body sample
const AFontPairOption = ({ name, mood, display, body, sel, onClick }: any) => (
  <button type="button" onClick={onClick} aria-pressed={!!sel} style={{
    ...CARD_BUTTON_RESET,
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
  </button>
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

const fontFamilyCss = (face: any) => '"' + face.family + '", ' + ((FONT_FALLBACK as any)[face.category] || 'sans-serif');

const INSPIRATION_BRANDS = [
  { name:'Apple', category:'Consumer tech · Premium', hero:<AppleHero/>, style:{ label:'Minimal · Refined', pill:{ bg:'#FFFFFF', color:'#1D1D1F', font: APPLE_DISPLAY, weight: 500, tracking:'-0.005em', shadow:'inset 0 0 0 1px #D2D2D7', dot:'#1D1D1F' } } },
  { name:'Figma', category:'Design tool · Collaborative', hero:<FigmaHero/>, style:{ label:'Playful · Vibrant', pill:{ bg:'#0E0E0E', color:'#FFFFFF', font: FIGMA_TYPE, weight: 700, tracking:'-0.005em', dot:'#A259FF', dotSize: 6 } } },
  { name:'Perplexity', category:'AI search · Editorial', hero:<PerplexityHero/>, style:{ label:'Editorial · Considered', pill:{ bg:'#FBF7EE', color:'#1F4E47', font: PERPLEXITY_DISPLAY, weight: 500, italic: true, tracking:'-0.005em', size: 11.5, shadow:'inset 0 0 0 1px #E8DFC8', dot:'#1F4E47' } } },
  { name:'Tesla', category:'Automotive · Technology', hero:<TeslaHero/>, style:{ label:'Bold · Technical', pill:{ bg:'#E31937', color:'#FFFFFF', font: TESLA_TYPE, weight: 700, tracking:'0.18em', transform:'uppercase', size: 9.5, padding:'5px 11px', dot:'#000000', dotSize: 5 } } },
];

// A user-uploaded font, previewed in that font, selectable + removable.
const ACustomFontCard = ({ family, sel, onClick, onRemove }: any) => (
  <div style={{
    background:'var(--bg-elev)', borderRadius: 14, position:'relative',
    boxShadow: sel ? '0 0 0 2px #000, var(--shadow-xs)' : 'var(--shadow-xs), inset 0 0 0 1px var(--line)',
    padding: 14, display:'flex', flexDirection:'column', gap: 10,
  }}>
    {sel && (
      <div style={{position:'absolute', top: 10, right: 10, width: 18, height: 18, borderRadius: 99, background: '#000', color:'#fff', display:'inline-flex', alignItems:'center', justifyContent:'center', zIndex: 1}}>
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
    )}
    <button type="button" onClick={onClick} aria-pressed={!!sel}
      style={{ ...CARD_BUTTON_RESET, cursor:'pointer', display:'flex', flexDirection:'column', gap: 10 }}>
      <span style={{ display:'block', width:'100%', background:'var(--bg)', borderRadius: 8, boxShadow:'inset 0 0 0 1px var(--line)', padding:'12px 14px', minHeight: 78 }}>
        <span style={{ display:'block', fontFamily:'"' + family + '", sans-serif', fontSize: 24, color:'#000', lineHeight: 1 }}>Aa</span>
        <span style={{ display:'block', marginTop: 10, fontFamily:'"' + family + '", sans-serif', fontSize: 11, color:'var(--fg-2)', lineHeight: 1.45 }}>The quick brown fox jumps over the lazy dog.</span>
      </span>
      <span style={{ display:'block', minWidth:0, width:'100%' }}>
        <span style={{display:'block', fontFamily:'var(--font-display)', fontSize: 13, fontWeight: 700, letterSpacing:'-0.015em', color:'var(--fg-1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{family}</span>
        <span style={{display:'block', fontSize: 10.5, color:'var(--fg-3)', marginTop: 1, fontFamily:'var(--font-mono)'}}>Your font</span>
      </span>
    </button>
    <button onClick={onRemove} aria-label={'Remove ' + family} style={{position:'absolute', bottom:14, right:14, width:22, height:22, borderRadius:99, background:'transparent', border:0, cursor:'pointer', color:'var(--fg-3)', display:'inline-flex', alignItems:'center', justifyContent:'center', flex:'0 0 auto'}}>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
  </div>
);

// Dashed "upload your font" card.
const AUploadFontCard = ({ onPick }: any) => {
  const ref = React.useRef<any>(null);
  return (
    <button type="button" onClick={() => ref.current && ref.current.click()} style={{
      ...CARD_BUTTON_RESET,
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
    </button>
  );
};

// Typography section — open-source pairs, custom uploads, and Let AI choose.
const ATypographySection = () => {
  const { step2, setStep2 } = useStep2();
  const customFonts = step2.custom_fonts || [];
  const [uploadErr, setUploadErr] = React.useState('');

  React.useEffect(() => {
    OPEN_SOURCE_FONT_PAIRS.forEach((p) => { ensureGoogleFont(p.display.family); ensureGoogleFont(p.body.family); });
  }, []);
  React.useEffect(() => {
    customFonts.forEach((cf: any) => registerCustomFont(cf.family, cf.dataUrl));
  }, [customFonts]);

  // Defer to the studio rather than picking from the list (see AI_CHOICE).
  const fontDelegated = step2.font === AI_CHOICE;
  const pickFont = () => setStep2({ font: fontDelegated ? null : AI_CHOICE });

  const onUpload = async (file: any) => {
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
  const removeCustom = (id: any) => {
    setStep2({
      custom_fonts: customFonts.filter((c: any) => c.id !== id),
      font: step2.font === 'custom:' + id ? null : step2.font,
    });
  };

  return (
    <div style={{marginBottom: 12}}>
      <ASectionHead n="03" title="Typography" sub="Open-source pairs previewed live — or upload your own font." ai onAI={pickFont} aiActive={fontDelegated}/>
      {fontDelegated && <ADelegatedNote what="typography" onClear={pickFont} />}
      <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap: 10, opacity: fontDelegated ? 0.45 : 1}}>
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
        {customFonts.map((cf: any) => (
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

export const DirA_Step3_Style = () => {
  const { step2, setStep2 } = useStep2();
  const { draft } = useBrandDraft();
  const { navigate } = useRouter();
  // A style is the gate. Palette and typography can be delegated to the studio
  // and often are, so requiring them would block the path this screen invites.
  //
  // It lives on the brand's own `style_id` column, not in the step2 blob —
  // both the direction cards and "Fluid decides" write there, and delegating
  // stores the AI_CHOICE sentinel, which counts as decided.
  const styleReady = !!(draft && draft.style_id);

  // Load all preview fonts once when the step opens.
  React.useEffect(() => {
    OPEN_SOURCE_FONT_PAIRS.forEach((p) => { ensureGoogleFont(p.display.family); ensureGoogleFont(p.body.family); });
  }, []);

  // Defer to the studio rather than picking from the list (see AI_CHOICE).
  const paletteDelegated = step2.palette === AI_CHOICE;
  const pickPalette = () => setStep2({ palette: paletteDelegated ? null : AI_CHOICE });

  return (
  <AWizardLayout
    step={4}
    title="Choose your visual direction."
    subtitle="Start from a brand you admire, or build it piece by piece. You can mix both."
    status="Draft"
    progress="Step 4 of 5"
    nextLabel="Assemble Brand Kit"
    dockCopy={styleReady
      ? 'Style set. Your brand kit is ready to assemble.'
      : 'Pick a visual direction — or let the studio choose one — to continue.'}
    nextDisabled={!styleReady}
    onNext={() => { if (styleReady) navigate('step5'); }}
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
      <ASectionHead n="02" title="Color palette" sub="Hand-picked palettes that carry the chosen register." ai onAI={pickPalette} aiActive={paletteDelegated}/>
      {paletteDelegated && <ADelegatedNote what="colour palette" onClear={pickPalette} />}
      <div style={{display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap: 10, opacity: paletteDelegated ? 0.45 : 1}}>
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

// ── Custom (user-uploaded) fonts ──────────────────────────────────────
function readFileAsDataURL(file: any) {
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

async function registerCustomFont(family: any, dataUrl: any) {
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

