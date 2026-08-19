"use client";

// Extracted from the original single-file Prototype.tsx as part of #175's
// route split. The code below is unchanged; only the import/export header
// around it is new.

import React from "react";
import { ALogoReferenceCard, ARefinementReadout, LOGO_STYLE_PLACEHOLDERS, LOGO_TYPE_OPTIONS, LogoReferenceContext, LogoStepShell, readRefinementAxes, useLogoFlowNav } from "../_kit/logo-flow";
import { useBrandDraft } from "../_state/brand-draft-context";

// Standalone logo studio · Step 4 · Reference gallery. This step captures
// visual preferences only; the next step will generate original sketches from
// the brief, style, type, and the references liked here.
export const DirA_LogoReferences = () => {
  const { draft, setData } = useBrandDraft();
  const navigate = useLogoFlowNav();
  const data = (draft && draft.data) || {};
  const selectedTypes = Array.isArray(data.logo_types) ? data.logo_types.slice(0, 1) : (data.logo_type ? [data.logo_type] : []);
  const aiChoosesType = data.logo_type_mode === 'ai';
  const direction = data.logo_direction || {};
  const selectedStyles = direction.mode === 'manual' ? (Array.isArray(direction.style_ids) ? direction.style_ids.slice(0, 1) : (direction.style_id ? [direction.style_id] : [])) : [];
  const typeLabel = aiChoosesType ? 'Fluid chooses' : selectedTypes.map((id: any) => (LOGO_TYPE_OPTIONS.find((type) => type.id === id) || {}).label).filter(Boolean).join(' · ') || 'Logo type';
  const styleLabel = direction.mode === 'ai' ? 'Fluid chooses' : selectedStyles.map((id: any) => (LOGO_STYLE_PLACEHOLDERS.find((style) => style.id === id) || {}).label).filter(Boolean).join(' · ') || 'Visual style';
  const [likes, setLikes] = React.useState(data.logo_reference_likes || []);
  const [dislikes, setDislikes] = React.useState(data.logo_reference_dislikes || []);
  const [references, setReferences] = React.useState<any>(null);
  const [loadError, setLoadError] = React.useState('');

  // What the picks imply, computed from the references already on screen so it
  // updates the instant something is liked — no round trip.
  const byId = React.useMemo(() => {
    const m = new Map();
    (references || []).forEach((r: any) => m.set(r.id, r));
    return m;
  }, [references]);
  const derivedAxes = React.useMemo(
    () => readRefinementAxes(
      likes.map((id: any) => byId.get(id)).filter(Boolean),
      dislikes.map((id: any) => byId.get(id)).filter(Boolean),
    ),
    [likes, dislikes, byId],
  );

  // Pull references that actually match the brief: the mark types chosen in
  // Step 3, ranked against the visual directions chosen in Step 2. Delegating
  // either ("Let Fluid choose") simply omits that filter.
  const typesKey = aiChoosesType ? '' : selectedTypes.join(',');
  const stylesKey = direction.mode === 'ai' ? 'fluid-choice' : selectedStyles.join(',');
  React.useEffect(() => {
    let cancelled = false;
    // Resetting to a loading state before the fetch below is the point —
    // not a candidate for moving out of the effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReferences(null); setLoadError('');
    const params = new URLSearchParams({ limit: '16' });
    if (typesKey) params.set('types', typesKey);
    if (stylesKey) params.set('styles', stylesKey);
    fetch('/api/logo-references?' + params.toString(), { cache: 'no-store' })
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => {
        if (cancelled) return;
        if (!ok) { setLoadError(j.error || "Couldn't load references."); setReferences([]); return; }
        setReferences(j.references || []);
      })
      .catch(() => { if (!cancelled) { setLoadError('Network error. Check your connection.'); setReferences([]); } });
    return () => { cancelled = true; };
  }, [typesKey, stylesKey]);

  const toggleLike = (id: any) => {
    const removing = likes.includes(id);
    const next = removing ? likes.filter((item: any) => item !== id) : [...likes, id];
    const nextDislikes = dislikes.filter((item: any) => item !== id);
    setLikes(next);
    setDislikes(nextDislikes);
    setData({
      logo_reference_likes: next,
      logo_reference_dislikes: nextDislikes,
      logo_reference_context: {
        logo_types: selectedTypes,
        logo_type_mode: aiChoosesType ? 'ai' : 'manual',
        visual_styles: selectedStyles.length ? selectedStyles : (direction.mode === 'ai' ? ['fluid-choice'] : []),
      },
    });
  };
  const toggleDislike = (id: any) => {
    const next = dislikes.includes(id) ? dislikes.filter((item: any) => item !== id) : [...dislikes, id];
    const nextLikes = likes.filter((item: any) => item !== id);
    setDislikes(next);
    setLikes(nextLikes);
    setData({
      logo_reference_likes: nextLikes,
      logo_reference_dislikes: next,
      logo_reference_context: {
        logo_types: selectedTypes,
        logo_type_mode: aiChoosesType ? 'ai' : 'manual',
        visual_styles: selectedStyles.length ? selectedStyles : (direction.mode === 'ai' ? ['fluid-choice'] : []),
      },
    });
  };

  return (
    <LogoStepShell
      step={4}
      title="Browse logo references."
      subtitle="Like as many existing logos as you need. Fluid will use them in the order you choose them."
      dockCopy={likes.length
        ? `${likes.length} liked — concepts are generated in ordered batches of six.`
        : 'Like the references that feel most right.'}
      nextLabel="Continue to concepts"
      onBack={() => navigate('logo-type')}
      onNext={() => { if (likes.length) navigate('logo-sketches'); }}
      nextDisabled={likes.length === 0}
    >
      <section aria-labelledby="logo-references-heading" style={{display:'flex',flexDirection:'column',gap:18}}>
        <div>
          <div className="eyebrow" style={{color:'var(--fg-3)'}}>Reference gallery</div>
          <h3 id="logo-references-heading" style={{margin:'6px 0 0',fontFamily:'var(--font-display)',fontSize:20,fontWeight:700,color:'#000',letterSpacing:'-0.015em'}}>Save the directions worth developing.</h3>
        </div>

        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <LogoReferenceContext label="Style" value={styleLabel}/>
          <LogoReferenceContext label="Type" value={typeLabel}/>
        </div>

        {loadError && (
          <div style={{fontSize:12.5,color:'var(--destructive)'}}>{loadError}</div>
        )}

        <ARefinementReadout axes={derivedAxes} sampled={likes.length + dislikes.length} />

        {references === null ? (
          <div className="logo-references-grid">
            {/* Varied skeleton heights so the loading state previews the
                collage rather than promising a uniform grid. */}
            {[190, 250, 160, 220, 170, 240, 200, 150].map((h, i) => (
              <div key={i} className="logo-reference-card" style={{height:h,borderRadius:16,background:'var(--bg-sunken)',boxShadow:'inset 0 0 0 1px var(--line)'}} />
            ))}
          </div>
        ) : references.length === 0 ? (
          <div style={{
            padding:'28px 20px',borderRadius:14,background:'var(--bg-sunken)',
            boxShadow:'inset 0 0 0 1px var(--line)',fontSize:13,color:'var(--fg-3)',textAlign:'center',
          }}>
            No references match that combination yet. Try another style or logo type.
          </div>
        ) : (
          <div className="logo-references-grid">
            {references.map((reference: any) => (
              <ALogoReferenceCard
                key={reference.id}
                reference={reference}
                liked={likes.includes(reference.id)}
                disliked={dislikes.includes(reference.id)}
                onLike={() => toggleLike(reference.id)}
                onDislike={() => toggleDislike(reference.id)}
              />
            ))}
          </div>
        )}
      </section>
    </LogoStepShell>
  );
};

