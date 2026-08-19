"use client";

// Extracted from the original single-file Prototype.tsx as part of #175's
// route split. The code below is unchanged; only the import/export header
// around it is new.

import React from "react";
import { MAX_REFINE_VERSIONS, defaultVersionPalettes, normaliseHex } from "@/lib/logo-refine";
import { apiRefineLogoSketches, apiVectorizeLogo } from "../_kit/api";
import { AFinalistCard, ASketchCard, AVersionPalette, LogoStepShell, useLogoFlowNav } from "../_kit/logo-flow";
import { Sparkle, Thinking } from "../_kit/ui";
import { useBrandDraft } from "../_state/brand-draft-context";

// Standalone logo studio · Step 6 · Refinement. The board is divergence; this
// is convergence, and convergence means committing. The client briefs it: ONE
// concept off the board, how many versions of it they want, and the colours
// each version is drawn in. Liking stays unlimited — the board is a shelf — but
// only one concept comes through this door. It is a single charge, so nothing
// runs until the brief is complete and the client asks for it.
export const DirA_LogoRefine = () => {
  const { draft, setField, setData } = useBrandDraft();
  const navigate = useLogoFlowNav();
  const data = (draft && draft.data) || {};
  const brandId = draft && draft.id;

  const board = Array.isArray(data.logo_board) ? data.logo_board : [];
  const likeIds = Array.isArray(data.logo_board_likes) ? data.logo_board_likes : [];
  const liked = board.filter((s: any) => likeIds.includes(s.id));

  // The brand's own colours seed the version palettes when it has any; with no
  // palette saved the defaults are obvious placeholders the client will replace.
  const brandColors = React.useMemo(() => {
    const p = data.palette;
    const fromPalette = Array.isArray(p && p.colors)
      ? p.colors.map((c: any) => c && c.hex).filter(Boolean)
      : [];
    return fromPalette;
  }, [data.palette]);

  // A single liked concept needs no choosing. More than one, and the client
  // picks — refinement develops exactly one.
  const [conceptId, setConceptId] = React.useState(
    data.logo_refine_concept || (liked.length === 1 ? liked[0].id : ''),
  );
  const concept = liked.find((s: any) => s.id === conceptId) || null;

  const [versions, setVersions] = React.useState(() => {
    const saved = Array.isArray(data.logo_refine_versions) ? data.logo_refine_versions : null;
    return saved && saved.length ? saved : defaultVersionPalettes(2, brandColors);
  });

  const [finalists, setFinalists] = React.useState(data.logo_finalists || []);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [vectorizing, setVectorizing] = React.useState('');
  const chosen = (draft && draft.logo_choice) || null;

  const persistBrief = (nextConceptId: any, nextVersions: any) => {
    setData({
      logo_refine_concept: nextConceptId,
      logo_refine_versions: nextVersions,
    });
  };

  const pickConcept = (id: any) => {
    setConceptId(id);
    persistBrief(id, versions);
  };

  // Changing the count keeps the palettes already set and only fills or trims
  // the tail, so raising it from 2 to 3 doesn't discard the two you tuned.
  const setVersionCount = (n: any) => {
    const count = Math.min(MAX_REFINE_VERSIONS, Math.max(1, n));
    const filled = defaultVersionPalettes(count, brandColors);
    const next = Array.from({ length: count }, (_, i) => versions[i] || filled[i]);
    setVersions(next);
    persistBrief(conceptId, next);
  };

  const setVersionColors = (i: any, colors: any) => {
    const next = versions.map((v: any, j: any) => (j === i ? { colors } : v));
    setVersions(next);
    persistBrief(conceptId, next);
  };

  // Every version must carry at least one colour we can hand a renderer. The
  // hex fields are free text while you type, so a half-typed "#0e0" blocks the
  // button rather than silently shipping a colour nobody chose.
  const briefReady = !!concept
    && versions.length > 0
    && versions.every((v: any) => (v.colors || []).some((c: any) => !!normaliseHex(c)));

  const refine = async () => {
    if (!brandId || loading || !briefReady) return;
    setLoading(true); setError('');
    // Send only the colours that parse, in order, so a stray keystroke in a
    // hex field can't reach the studio.
    const clean = versions.map((v: any) => ({
      colors: (v.colors || []).map(normaliseHex).filter(Boolean),
    }));
    const res = await apiRefineLogoSketches(brandId, concept.id, clean);
    if (res.error) {
      setError(res.error);
    } else {
      setFinalists(res.finalists);
      // The server has already merged these onto the brand. Mirroring them into
      // the local draft keeps the screen correct if the client steps away and
      // comes back before the next refresh lands.
      setData({
        logo_finalists: res.finalists,
        logo_refine_concept: concept.id,
        logo_refine_versions: clean,
        logos: res.finalists.map((f: any) => ({
          name: f.name, descriptor: f.idea, svg: f.svg || '', image_url: f.image_url,
        })),
      });
    }
    setLoading(false);
  };

  // Choosing a mark is also what commissions the real vector. Cached
  // server-side, so re-picking one already traced costs nothing.
  const choose = async (f: any) => {
    setField('logo_choice', f.name);
    if (f.svg || vectorizing) return;
    setVectorizing(f.id); setError('');
    const res = await apiVectorizeLogo(brandId, f.id);
    if (res.error) {
      setError(res.error);
    } else {
      const next = finalists.map((x: any) => (x.id === f.id ? { ...x, svg: res.svg, vector_url: res.url } : x));
      setFinalists(next);
      setData({
        logo_finalists: next,
        logos: next.map((x: any) => ({
          name: x.name, descriptor: x.idea, svg: x.svg || '', image_url: x.image_url,
        })),
      });
    }
    setVectorizing('');
  };

  const done = finalists.length > 0;
  const markCount = versions.length;
  const dockCopy = done
    ? (chosen ? `${chosen} is your mark. Assemble the kit when you're ready.` : 'Pick the mark you want and the studio will trace it into vectors.')
    : (liked.length === 0
        ? 'Go back and like at least one concept first.'
        : !concept
          ? 'Choose the one concept you want refined.'
          : briefReady
            ? `“${concept.name}” in ${markCount} version${markCount === 1 ? '' : 's'}, ready to draw.`
            : 'Every version needs at least one colour.');

  const toolBtn = {
    padding:'9px 13px',borderRadius:9,fontSize:12,fontWeight:600,border:0,
    display:'inline-flex',alignItems:'center',gap:7,whiteSpace:'nowrap',
  };

  return (
    <LogoStepShell
      step={6}
      title={done ? 'Choose the mark.' : 'Brief the refinement.'}
      subtitle={done
        ? 'Your finished marks, with the studio’s note on each.'
        : 'Pick the one concept to develop, how many versions you want, and the colours each version is drawn in.'}
      dockCopy={dockCopy}
      nextLabel="Continue to export"
      onBack={() => navigate('logo-sketches')}
      onNext={() => { if (chosen) navigate('logo-export'); }}
      nextDisabled={!chosen}
    >
      <section aria-labelledby="logo-refine-heading" style={{display:'flex',flexDirection:'column',gap:18}}>
        <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:16,flexWrap:'wrap'}}>
          <div>
            <div className="eyebrow" style={{color:'var(--fg-3)'}}>
              Refinement{liked.length ? ` · ${liked.length} liked` : ''}{finalists.length ? ` · ${finalists.length} finished` : ''}
            </div>
            <h3 id="logo-refine-heading" style={{
              margin:'6px 0 0',fontFamily:'var(--font-display)',fontSize:20,fontWeight:700,
              color:'#000',letterSpacing:'-0.015em',
            }}>{done ? 'Your finished marks.' : 'One concept, resolved your way.'}</h3>
          </div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <button type="button" onClick={refine} disabled={loading || !briefReady}
              style={{...toolBtn,background:'#0E0F12',color:'#fff',
                cursor:loading || !briefReady ? 'default' : 'pointer',
                opacity:loading || !briefReady ? .5 : 1}}>
              <Sparkle size={12} color="#FDBA50"/>
              {loading
                ? 'Drawing and critiquing…'
                : (done
                    ? 'Refine again'
                    : `Refine ${markCount} version${markCount === 1 ? '' : 's'}`)}
            </button>
          </div>
        </div>

        {liked.length === 0 && (
          <div role="status" style={{
            padding:'14px 16px',borderRadius:12,background:'var(--bg-elev)',
            boxShadow:'inset 0 0 0 1px var(--line)',fontSize:12.5,color:'var(--fg-2)',
            display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap',
          }}>
            <span>Refinement works from the concepts you liked, and none are marked yet.</span>
            <button type="button" onClick={() => navigate('logo-sketches')} style={{
              padding:'5px 10px',borderRadius:8,background:'#000',color:'#fff',
              fontSize:11.5,fontWeight:600,border:0,cursor:'pointer',
            }}>Back to the board</button>
          </div>
        )}

        {error && (
          <div role="alert" style={{
            padding:'12px 14px',borderRadius:12,background:'rgba(253,121,71,.10)',
            boxShadow:'inset 0 0 0 1px rgba(253,121,71,.30)',fontSize:12.5,color:'#A8421F',
            display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap',
          }}>
            <span>{error}</span>
            <button type="button" onClick={refine} style={{
              padding:'5px 10px',borderRadius:8,background:'#000',color:'#fff',
              fontSize:11.5,fontWeight:600,border:0,cursor:'pointer',
            }}>Try again</button>
          </div>
        )}

        {/* The brief, in the order the decisions are made: which concept, how
            many versions of it, and what each version is drawn in. */}
        {!done && liked.length > 0 && (
          <>
            <div>
              <div className="eyebrow" style={{color:'var(--fg-3)',marginBottom:8}}>
                1 · The concept{liked.length > 1 ? ' — pick one' : ''}
              </div>
              <div style={{
                padding:'12px 14px',borderRadius:12,background:'var(--bg-elev)',
                boxShadow:'inset 0 0 0 1px var(--line)',fontSize:11,color:'var(--fg-3)',
                lineHeight:1.5,marginBottom:12,
              }}>
                {liked.length > 1
                  ? `You have ${liked.length} concepts saved. Refinement develops one of them — converging means committing to an idea and seeing it resolved properly. The rest stay liked on the board for later.`
                  : 'This is the concept the studio will develop. Every mark that comes back is a resolution of it — nothing new is invented alongside it.'}
              </div>
              <div className="home-grid-3" style={{display:'grid',gap:12}}>
                {liked.map((s: any) => {
                  const sel = s.id === conceptId;
                  return (
                    <div
                      key={s.id}
                      role="radio"
                      aria-checked={sel}
                      tabIndex={0}
                      onClick={() => pickConcept(s.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pickConcept(s.id); }
                      }}
                      style={{
                        borderRadius:18,cursor:'pointer',
                        boxShadow: sel ? '0 0 0 2px #000' : 'none',
                        opacity: sel || !concept ? 1 : .55,
                        transition:'opacity .15s ease',
                      }}
                    >
                      <ASketchCard sketch={s} liked={sel} onLike={() => pickConcept(s.id)} />
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="eyebrow" style={{color:'var(--fg-3)',marginBottom:8}}>
                2 · How many versions
              </div>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                {Array.from({ length: MAX_REFINE_VERSIONS }, (_, i) => i + 1).map((n) => {
                  const sel = versions.length === n;
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setVersionCount(n)}
                      disabled={loading}
                      aria-pressed={sel}
                      style={{
                        padding:'9px 16px',borderRadius:10,border:0,fontSize:12.5,fontWeight:600,
                        background: sel ? '#0E0F12' : 'var(--bg-elev)',
                        color: sel ? '#fff' : 'var(--fg-2)',
                        boxShadow: sel ? 'none' : 'inset 0 0 0 1px var(--line)',
                        cursor: loading ? 'default' : 'pointer',
                      }}
                    >
                      {n}
                    </button>
                  );
                })}
                <span style={{fontSize:11,color:'var(--fg-4)',alignSelf:'center',lineHeight:1.4}}>
                  Each version is a different construction of the same idea — weight,
                  proportion, how the parts join. Four is the most one pass will draw.
                </span>
              </div>
            </div>

            <div>
              <div className="eyebrow" style={{color:'var(--fg-3)',marginBottom:8}}>
                3 · Colours for each version
              </div>
              <div style={{
                padding:'12px 14px',borderRadius:12,background:'var(--bg-elev)',
                boxShadow:'inset 0 0 0 1px var(--line)',fontSize:11,color:'var(--fg-3)',
                lineHeight:1.5,marginBottom:12,
              }}>
                The studio draws each version in exactly these colours and no others.
                The first is the primary.
                {brandColors.length === 0 && ' This brand has no palette saved yet, so these are starting points — change them to whatever you want.'}
              </div>
              <div className="home-grid-3" style={{display:'grid',gap:12}}>
                {versions.map((v: any, i: any) => (
                  <AVersionPalette
                    key={i}
                    index={i}
                    colors={v.colors || []}
                    disabled={loading}
                    onChange={(colors: any) => setVersionColors(i, colors)}
                  />
                ))}
              </div>
            </div>
          </>
        )}

        {(done || loading) && (
          <div className="home-grid-3" style={{display:'grid',gap:12}}>
            {finalists.map((f: any) => (
              <AFinalistCard key={f.id} f={f} sel={chosen === f.name}
                busy={vectorizing === f.id} onClick={() => choose(f)} />
            ))}
            {loading && !done && Array.from({ length: markCount }).map((_, i) => (
              <div key={`pending-${i}`} style={{
                background:'var(--bg-elev)',borderRadius:16,minHeight:210,
                boxShadow:'inset 0 0 0 1px var(--line)',
                display:'flex',alignItems:'center',justifyContent:'center',
              }}>
                {/* One spinner for the set: refinement is a single pass, and a
                    spinner per slot would read as separate waits. */}
                {i === 0 ? (
                  <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8,padding:12,textAlign:'center'}}>
                    <Thinking/>
                    <span style={{fontSize:11,color:'var(--fg-4)',lineHeight:1.4}}>
                      Drawing {markCount} version{markCount === 1 ? '' : 's'} of “{concept ? concept.name : 'your concept'}”…
                    </span>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>
    </LogoStepShell>
  );
};

