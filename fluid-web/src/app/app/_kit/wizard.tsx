"use client";

// Extracted from the original single-file Prototype.tsx as part of #175's
// route split. The code below is unchanged; only the import/export header
// around it is new.

import React from "react";
import { CARD_BUTTON_RESET } from "./a11y";
import { ADockActivity, useActivityLog } from "./activity";
import { __assets } from "./assets";
import { AShell } from "./shell";
import { ArrowRight, Chip, Thinking } from "./ui";
import { useRouter } from "../_state/router-context";

// Progress tracker for the wizard flow
const AStepProgress = ({ step }: any) => {
  const { navigate } = useRouter();
  const steps = [
    { n: 1, label: 'Brief' },
    { n: 2, label: 'Name' },
    { n: 3, label: 'Logo' },
    { n: 4, label: 'Style' },
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
          {/* Only completed steps are navigable, so only those are controls —
              rendering an always-on button would put empty targets in the tab
              order for steps that go nowhere. */}
          {(() => {
            const inner = (
              <>
                <span style={{
                  width:22,height:22,borderRadius:'50%',
                  background: s.n === step ? '#000' : (s.n < step ? 'var(--line-strong)' : 'transparent'),
                  color: s.n === step ? '#fff' : (s.n < step ? 'var(--fg-1)' : 'var(--fg-3)'),
                  border: s.n >= step ? '1px solid var(--line-strong)' : 'none',
                  display:'flex',alignItems:'center',justifyContent:'center',
                  fontSize:10,fontWeight:700,fontFamily:'var(--font-mono)'
                }}>{s.n < step ? (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                ) : s.n}</span>
                <span style={{fontSize:12,fontWeight:s.n === step ? 700 : 500,color:s.n === step ? '#000' : 'var(--fg-3)'}}>{s.label}</span>
              </>
            );
            const layout = {display:'flex',alignItems:'center',gap:6} as React.CSSProperties;
            return done ? (
              <button type="button" onClick={() => navigate('step' + s.n)}
                aria-label={'Back to ' + s.label} title={'Back to ' + s.label}
                style={{...CARD_BUTTON_RESET, width:'auto', ...layout, cursor:'pointer'}}>
                {inner}
              </button>
            ) : (
              <div aria-current={s.n === step ? 'step' : undefined} style={{...layout, cursor:'default'}}>{inner}</div>
            );
          })()}
        </React.Fragment>
        );
      })}
    </div>
  );
};

export const AWizardLayout = ({ step, title, subtitle, status, progress, children, onNext, onBack, nextLabel, backLabel, dockCopy, nextDisabled, isThinking }: any) => {
  const { navigate } = useRouter();
  const activity = useActivityLog();
  const [logOpen, setLogOpen] = React.useState(false);
  // Back steps to the previous wizard step (available from step 2 on), unless
  // the step runs sub-steps of its own — step 3 walks back through those first
  // and only leaves the step once it reaches the beginning of them.
  const canBack = step > 1 || !!onBack;
  const goBack = onBack || (() => navigate('step' + (step - 1)));
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
        display:'flex',alignItems: logOpen ? 'flex-start' : 'center',gap:14,
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
          <button onClick={goBack} data-selfnav style={{
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
        {activity.events.length || activity.running ? (
          <ADockActivity
            events={activity.events}
            running={activity.running}
            failure={activity.failure}
            open={logOpen}
            onToggle={() => setLogOpen((o) => !o)}
          />
        ) : (
          <div style={{flex:1, minWidth:0, fontSize: 13, color:'rgba(255,255,255,.85)'}}>
            {isThinking ? (
              <span style={{display:'inline-flex',alignItems:'center',gap:8}}>
                Fluid AI is drafting options... <Thinking/>
              </span>
            ) : (dockCopy || "Fill in card details to refine the strategy.")}
          </div>
        )}
        <button
          onClick={onNext}
          disabled={nextDisabled}
          aria-disabled={nextDisabled}
          data-selfnav
          style={{
            padding:'8px 14px',borderRadius:8,
            background: nextDisabled ? 'rgba(255,255,255,.14)' : '#fff',
            color: nextDisabled ? 'rgba(255,255,255,.48)' : '#000',
            fontSize:12,fontWeight:600,display:'inline-flex',alignItems:'center',gap:6,
            border:0, cursor: nextDisabled ? 'not-allowed' : 'pointer',
          }}
        >
          {nextLabel || 'Continue'} <ArrowRight size={12}/>
        </button>
      </div>
    </div>
  </AShell>
  );
};

// =====================================================================
// A2 · Step 1 · Brief Input Screen
// Three structured fields: Brand description (required, the hero field
// with AI assist), Audience (optional) and Competitors (optional, chip
// input).
// =====================================================================

// Reusable card shell for each field on the brief screen. Step number
// badge + title on the left, optional badge / counter on the right.
export const AFieldCard = ({ n, title, optional, meta, children }: any) => (
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
export const ACompetitorChip = ({ name, domain, onRemove }: any) => (
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

