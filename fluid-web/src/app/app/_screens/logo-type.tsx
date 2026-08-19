"use client";

// Extracted from the original single-file Prototype.tsx as part of #175's
// route split. The code below is unchanged; only the import/export header
// around it is new.

import React from "react";
import { ALogoTypeCard, LOGO_TYPE_OPTIONS, LogoStepShell, resetLogoDirectionWork, useLogoFlowNav } from "../_kit/logo-flow";
import { useBrandDraft } from "../_state/brand-draft-context";

// Standalone logo studio · Step 3 · Logo type. Visual treatments remain for
// the later concepts step; this choice controls the structural logo direction.
export const DirA_LogoType = () => {
  const { draft, setData } = useBrandDraft();
  const navigate = useLogoFlowNav();
  const data = (draft && draft.data) || {};
  const aiChoosesType = data.logo_type_mode === 'ai';
  const selectedTypes = Array.isArray(data.logo_types)
    ? data.logo_types.slice(0, 1)
    : (data.logo_type ? [data.logo_type] : []);

  const chooseType = (typeId: any) => {
    if (typeId === 'ai') {
      setData({
        ...resetLogoDirectionWork(),
        logo_type_mode: aiChoosesType ? null : 'ai',
        logo_types: [],
        logo_type: '',
      });
      return;
    }
    const next = selectedTypes.includes(typeId)
      ? []
      : [typeId];
    setData({
      ...resetLogoDirectionWork(),
      logo_type_mode: next.length ? 'manual' : null,
      logo_types: next,
      logo_type: next[0] || '',
    });
  };
  const continueToConcepts = () => {
    if (selectedTypes.length || aiChoosesType) navigate('logo-references');
  };

  return (
    <LogoStepShell
      step={3}
      title="Choose a logo type."
      subtitle="Pick the logo structure for the first round of concepts."
      dockCopy="Choose one logo type to shape the concept round."
      nextLabel="Continue to concepts"
      onBack={() => navigate('logo-direction')}
      onNext={continueToConcepts}
      nextDisabled={selectedTypes.length === 0 && !aiChoosesType}
    >
      <section aria-labelledby="logo-type-heading" style={{display:'flex',flexDirection:'column',gap:20}}>
        <div>
          <div className="eyebrow" style={{color:'var(--fg-3)'}}>Logo type</div>
          <h3 id="logo-type-heading" style={{
            margin:'6px 0 0',fontFamily:'var(--font-display)',fontSize:20,fontWeight:700,
            color:'#000',letterSpacing:'-0.015em',
          }}>Select one starting structure.</h3>
        </div>

        <div className="logo-type-grid" style={{display:'grid',gridTemplateColumns:'repeat(4, minmax(0, 1fr))',gap:14}}>
          {LOGO_TYPE_OPTIONS.map((type) => {
            const selected = type.ai ? aiChoosesType : selectedTypes.includes(type.id);
            return (
              <ALogoTypeCard key={type.id} type={type} selected={selected} onClick={() => chooseType(type.id)} />
            );
          })}
        </div>
      </section>
    </LogoStepShell>
  );
};

