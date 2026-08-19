"use client";

// Extracted from the original single-file Prototype.tsx as part of #175's
// route split. The code below is unchanged; only the import/export header
// around it is new.

import React from "react";
import { LOGO_STYLE_PLACEHOLDERS, LogoStepShell, resetLogoDirectionWork, useLogoFlowNav } from "../_kit/logo-flow";
import { Sparkle } from "../_kit/ui";
import { useBrandDraft } from "../_state/brand-draft-context";

// Standalone logo studio · Step 2 · Visual style. Each card pairs a custom
// fictional identity board with concise guidance for the direction.
export const DirA_LogoDirection = () => {
  const { draft, setData } = useBrandDraft();
  const navigate = useLogoFlowNav();
  const data = (draft && draft.data) || {};
  const direction = data.logo_direction || {};
  const selectedStyles = direction.mode === 'manual'
    ? (Array.isArray(direction.style_ids) ? direction.style_ids.slice(0, 1) : (direction.style_id ? [direction.style_id] : []))
    : [];
  const fluidChooses = direction.mode === 'ai';
  const ready = selectedStyles.length > 0 || fluidChooses;

  const chooseStyle = (styleId: any) => {
    const next = selectedStyles.includes(styleId)
      ? []
      : [styleId];
    setData({
      ...resetLogoDirectionWork(),
      logo_direction: { mode: next.length ? 'manual' : null, style_ids: next, style_id: next[0] || null },
    });
  };
  const chooseFluid = () => {
    setData({
      ...resetLogoDirectionWork(),
      logo_direction: fluidChooses ? { mode: null, style_ids: [], style_id: null } : { mode: 'ai', style_ids: [], style_id: null },
    });
  };
  const continueToConcepts = () => {
    if (ready) navigate('logo-type');
  };

  return (
    <LogoStepShell
      step={2}
      title="Pick a visual style."
      subtitle="Choose the visual world for the first round of logo concepts."
      dockCopy="Pick one visual world, or let Fluid make the call."
      nextLabel="Continue to logo type"
      onBack={() => navigate('logo-brief')}
      onNext={continueToConcepts}
      nextDisabled={!ready}
    >
      <section aria-labelledby="logo-style-heading" style={{display:'flex',flexDirection:'column',gap:20}}>
        <div className="logo-direction-toolbar" style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:16}}>
          <div>
            <div className="eyebrow" style={{color:'var(--fg-3)'}}>Visual style</div>
            <h3 id="logo-style-heading" style={{
              margin:'6px 0 0',fontFamily:'var(--font-display)',fontSize:20,fontWeight:700,
              color:'#000',letterSpacing:'-0.015em',
          }}>Pick one visual world.</h3>
          </div>
          <button
            type="button"
            onClick={chooseFluid}
            aria-pressed={fluidChooses}
            style={{
              display:'inline-flex',alignItems:'center',gap:7,padding:'9px 13px',borderRadius:9,
              background:fluidChooses ? '#0E0F12' : 'var(--bg-elev)',
              color:fluidChooses ? '#fff' : 'var(--fg-1)',
              boxShadow:fluidChooses ? '0 6px 18px rgba(0,0,0,.12)' : 'inset 0 0 0 1px var(--line-strong)',
              border:0,cursor:'pointer',fontSize:12,fontWeight:700,whiteSpace:'nowrap',
            }}
          >
            <Sparkle size={12} color={fluidChooses ? '#FDBA50' : 'currentColor'}/>
            {fluidChooses ? 'Fluid will choose' : 'Let Fluid choose'}
          </button>
        </div>

        <div className="logo-direction-grid" style={{display:'grid',gridTemplateColumns:'repeat(3, minmax(0, 1fr))',gap:14}}>
          {LOGO_STYLE_PLACEHOLDERS.map((style) => {
            const selected = selectedStyles.includes(style.id);
            return (
              <button
                key={style.id}
                type="button"
                onClick={() => chooseStyle(style.id)}
                aria-pressed={selected}
                className="logo-style-card-with-preview"
                style={{
                  height:200,padding:10,borderRadius:16,textAlign:'left',cursor:'pointer',
                  border:selected ? '2px solid #000' : '1px solid var(--line)',
                  background:selected ? '#fff' : 'var(--bg-elev)',
                  boxShadow:selected ? '0 10px 24px rgba(0,0,0,.10)' : 'var(--shadow-xs)',
                  display:'flex',flexDirection:'column',justifyContent:'space-between',
                  overflow:'hidden',transition:'border-color .15s, box-shadow .15s, transform .15s',
                }}
              >
                <div className="logo-style-preview-layout" style={{
                  width:'100%',height:'100%',display:'grid',
                  gridTemplateColumns:'minmax(0, 1.85fr) minmax(108px, .95fr)',gap:14,
                }}>
                  <div className="logo-style-preview-image" style={{
                    minWidth:0,minHeight:0,borderRadius:9,
                    backgroundColor:style.previewBg,backgroundImage:`url("${style.preview}")`,
                    backgroundSize:'contain',backgroundPosition:'center',backgroundRepeat:'no-repeat',
                    boxShadow:'inset 0 0 0 1px rgba(0,0,0,.10)',
                  }}/>
                  <div className="logo-style-preview-copy" style={{
                    minWidth:0,padding:'4px 4px 4px 0',display:'flex',flexDirection:'column',
                    alignItems:'flex-start',justifyContent:'center',gap:16,
                  }}>
                    <span style={{fontFamily:'var(--font-display)',fontSize:18,fontWeight:700,color:'#000',lineHeight:1.1}}>
                      {style.label}
                    </span>
                    <span style={{fontSize:11,color:'var(--fg-3)',lineHeight:1.45}}>
                      {style.description}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </LogoStepShell>
  );
};

