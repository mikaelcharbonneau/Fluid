"use client";

// Extracted from the original single-file Prototype.tsx as part of #175's
// route split. The code below is unchanged; only the import/export header
// around it is new.

import React from "react";
import { __assets } from "./assets";
import { useBrandDraft } from "../_state/brand-draft-context";
import { useRouter } from "../_state/router-context";

// ------------------------------------------------------------------
// 01-shared
// ------------------------------------------------------------------
// Shared bits used across all three direction prototypes.
// All components are written to `window` at the bottom because each
// `<script type="text/babel">` gets its own transform scope.

// Uses the same wordmark file as the marketing site so the two never drift.
export const FluidWordmark = ({ height = 22, color = 'ink' }) => (
  <img
    className="fl-wordmark"
    src={color === 'mono' ? __assets['assets/min/fluid-wordmark-mono.png'] : __assets['uuid/97b97e78-4145-428a-9c6f-c0ff3d3cb43d.png']}
    alt="Fluid"
    style={{ height, width: 'auto', display: 'block' }}
  />
);

const ChevronRight = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

export const SearchIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

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

const ARailIcon = ({ d, active, label }: any) => (
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
const TokenPill = ({ billing }: any) => {
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
  const goBilling = () => navigate('settings', { tab: 'billing' });
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

export const AShell = ({ children, activeNav = 'brands', breadcrumb }: any) => {
  const { user, billing } = useBrandDraft();
  return (
  <div className="ab" style={{display:'flex',flexDirection:'column'}}>
    {/* Top dock */}
    <header className="ash-header" style={{
      height: 60, flex: '0 0 60px',
      display: 'flex', alignItems: 'center', gap: 20,
      padding: '0 24px',
      borderBottom: '1px solid var(--line)',
      background: 'var(--bg)',
      position: 'relative', zIndex: 2,
    }}>
      <FluidWordmark height={22}/>
      <div className="ash-divider" style={{width:1, height:28, background:'var(--line)'}}/>
      <nav className="ash-breadcrumb" style={{display:'flex',alignItems:'center',gap:6,fontSize:13,color:'var(--fg-3)', minWidth:0, overflow:'hidden', whiteSpace:'nowrap'}}>
        {breadcrumb.map((b: any,i: any) => (
          <React.Fragment key={i}>
            {i>0 && <ChevronRight size={12}/>}
            <span style={{color: i === breadcrumb.length-1 ? 'var(--fg-1)' : 'var(--fg-3)', fontWeight: i === breadcrumb.length-1 ? 600 : 500}}>{b}</span>
          </React.Fragment>
        ))}
      </nav>

      <div style={{flex:1, minWidth: 12}}/>

      <button className="ash-search" style={{
        display:'inline-flex',alignItems:'center',gap:8,
        padding:'6px 12px',borderRadius:999,
        background:'var(--bg-elev)',boxShadow:'inset 0 0 0 1px var(--line)',
        fontSize:12,fontWeight:500,color:'var(--fg-2)',
        flex:'0 1 auto', minWidth:0, whiteSpace:'nowrap', overflow:'hidden',
      }}>
        <SearchIcon size={12}/> <span className="ash-search-label">Search brands, assets…</span>
        <span className="ash-search-kbd" style={{marginLeft:18,padding:'2px 6px',borderRadius:5,background:'var(--bg-sunken)',fontSize:10,fontFamily:'var(--font-mono)',color:'var(--fg-3)'}}>⌘K</span>
      </button>
      <TokenPill billing={billing}/>
      <div title={(user && (user.name || user.email)) || ''} style={{flex:'0 0 26px', width: 26, height: 26, borderRadius: 999, background: '#000', color:'#fff', fontSize: 11, fontWeight: 700, display:'inline-flex',alignItems:'center',justifyContent:'center'}}>{(user && user.initial) || '·'}</div>
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

// Crumb label → route the user expects to land on when clicking it.
// Brand creation is a conversation at its own URL. resolveClick may return
// this instead of a hash route; the delegate navigates out when it sees one.
export const CHAT = '/app/chat';

