"use client";

// Extracted from the original single-file Prototype.tsx as part of #175's
// route split. The code below is unchanged; only the import/export header
// around it is new.

import React from "react";
import { BOARD_SIZE, summariseBoardPlan } from "@/lib/logo-board";
import { apiGenerateLogoBoard, apiRepairLogoBoard } from "../_kit/api";
import { AI_CHOICE, ASketchCard, LogoStepShell, useLogoFlowNav } from "../_kit/logo-flow";
import { Sparkle, Thinking } from "../_kit/ui";
import { useBrandDraft } from "../_state/brand-draft-context";

// Standalone logo studio · Step 5 · Concepts. The first screen in this flow
// that spends tokens: each press draws up to six concepts from the next ordered
// batch of liked references. The client can regenerate until every saved
// reference has been explored.
export const DirA_LogoSketches = () => {
  const { draft, setData } = useBrandDraft();
  const navigate = useLogoFlowNav();
  const data = (draft && draft.data) || {};
  const brandId = draft && draft.id;
  const hasBrief = !!String((draft && draft.brief) || '').trim();

  const aiChoosesType = data.logo_type_mode === 'ai';
  const chosenTypes = Array.isArray(data.logo_types)
    ? data.logo_types.slice(0, 1)
    : (data.logo_type ? [data.logo_type] : []);
  const direction = data.logo_direction || {};
  const chosenStyles = direction.mode === 'manual'
    ? (Array.isArray(direction.style_ids) ? direction.style_ids.slice(0, 1) : (direction.style_id ? [direction.style_id] : []))
    : (direction.mode === 'ai' ? ['fluid-choice'] : []);

  // The standalone type cards use 'ai' for the delegated option; the shared
  // taxonomy uses the AI_CHOICE sentinel. Translate at the boundary so the
  // server sees one vocabulary.
  const requestTypes = aiChoosesType ? [AI_CHOICE] : chosenTypes;
  const referenceLikes = Array.isArray(data.logo_reference_likes) ? data.logo_reference_likes : [];
  const briefReady = hasBrief && requestTypes.length > 0 && referenceLikes.length > 0;

  const [board, setBoard] = React.useState(data.logo_board || []);
  const [likes, setLikes] = React.useState(data.logo_board_likes || []);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [assetError, setAssetError] = React.useState(false);
  const [notice, setNotice] = React.useState('');
  const initialBatchOffset = Number(data.logo_reference_batch_offset);
  const [remainingReferences, setRemainingReferences] = React.useState(
    Math.max(0, referenceLikes.length - (Number.isInteger(initialBatchOffset) && initialBatchOffset > 0 ? initialBatchOffset : 0)),
  );

  const persist = (nextBoard: any, nextLikes: any) => {
    setData({
      logo_board: nextBoard,
      logo_board_likes: nextLikes,
    });
  };

  // Exactly the plan the server will run — same function, same selections —
  // so what the client is shown before spending can't drift from what arrives.
  const plan = summariseBoardPlan(chosenStyles, requestTypes);
  // Each press consumes the next six liked references. Starting over resets
  // that queue to the first six references.
  const draw = async ({ fresh = false } = {}) => {
    if (!brandId || loading || !briefReady) return;
    setLoading(true); setError(''); setAssetError(false); setNotice('');
    const res = await apiGenerateLogoBoard(brandId, {
      mark_types: requestTypes,
      standalone_styles: chosenStyles,
      // The tagline is deliberately NOT sent as direction: Step 1 promises it
      // is context only and won't be forced into the mark.
    }, fresh);

    if (res.error) {
      setError(res.error);
    } else {
      const nextLikes: any[] = [];
      setBoard(res.board);
      setLikes(nextLikes);
      persist(res.board, nextLikes);
      // Two different shortfalls, and they're worth telling apart. A render
      // that failed is a retry; a reference with no caption yet is a gap in
      // the library that drawing again won't close.
      const notices = [];
      if (res.requested && res.drawn && res.drawn < res.requested) {
        notices.push(`${res.drawn} of ${res.requested} sketches came back — retry to generate the remaining directions.`);
      }
      if (typeof res.remaining === 'number') {
        setRemainingReferences(res.remaining);
        notices.push(`${res.remaining} liked reference${res.remaining === 1 ? '' : 's'} remain in the queue.`);
      }
      setNotice(notices.join(' '));
    }
    setLoading(false);
  };

  const repairImages = async () => {
    if (!brandId || loading) return;
    setLoading(true); setError('');
    const res = await apiRepairLogoBoard(brandId);
    if (res.error) {
      setError(res.error);
    } else {
      setBoard(res.board);
      persist(res.board, likes);
      setAssetError(false);
    }
    setLoading(false);
  };

  const toggleLike = (id: any) => {
    const next = likes.includes(id) ? likes.filter((x: any) => x !== id) : [...likes, id];
    setLikes(next);
    persist(board, next);
  };

  const toolBtn = {
    padding:'9px 13px',borderRadius:9,fontSize:12,fontWeight:600,border:0,
    display:'inline-flex',alignItems:'center',gap:7,whiteSpace:'nowrap',
  };
  const busyLabel = 'Sketching six concepts…';

  return (
    <LogoStepShell
      step={5}
      title="Explore concepts."
      subtitle="Six rough croquis at a time, each guided by a liked reference."
      dockCopy={likes.length
        ? `${likes.length} concept${likes.length === 1 ? '' : 's'} saved. You'll choose ${likes.length === 1 ? 'it' : 'one of them'} to refine next.`
        : 'Sketch a board, then like the ones worth keeping.'}
      nextLabel="Continue to refinement"
      onBack={() => navigate('logo-references')}
      onNext={() => { if (likes.length) navigate('logo-refine'); }}
      nextDisabled={likes.length === 0}
    >
      <section aria-labelledby="logo-sketches-heading" style={{display:'flex',flexDirection:'column',gap:18}}>
        <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:16,flexWrap:'wrap'}}>
          <div>
            <div className="eyebrow" style={{color:'var(--fg-3)'}}>
              Concepts{board.length ? ` · ${board.length} drawn` : ''}{likes.length ? ` · ${likes.length} liked` : ''}
            </div>
            <h3 id="logo-sketches-heading" style={{
              margin:'6px 0 0',fontFamily:'var(--font-display)',fontSize:20,fontWeight:700,
              color:'#000',letterSpacing:'-0.015em',
            }}>Build a board you actually like.</h3>
          </div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            {board.length > 0 && (
              <button type="button" onClick={repairImages} disabled={loading}
                style={{...toolBtn,background:'transparent',color:'var(--fg-2)',
                  boxShadow:'inset 0 0 0 1px var(--line-strong)',
                  cursor:loading ? 'default' : 'pointer',opacity:loading ? .5 : 1}}>
                Remove backgrounds
              </button>
            )}
            {board.length > 0 && (
              <button type="button" onClick={() => draw({ fresh: true })} disabled={loading || !briefReady}
                style={{...toolBtn,background:'transparent',color:'var(--fg-2)',
                  boxShadow:'inset 0 0 0 1px var(--line-strong)',
                  cursor:loading || !briefReady ? 'default' : 'pointer',opacity:loading || !briefReady ? .5 : 1}}>
                Start over
              </button>
            )}
            <button type="button" onClick={() => draw()} disabled={loading || !briefReady || (board.length > 0 && remainingReferences === 0)}
              style={{...toolBtn,background:'#0E0F12',color:'#fff',
                cursor:loading || !briefReady || (board.length > 0 && remainingReferences === 0) ? 'default' : 'pointer',opacity:loading || !briefReady || (board.length > 0 && remainingReferences === 0) ? .5 : 1}}>
              <Sparkle size={12} color="#FDBA50"/>
              {loading ? busyLabel : (board.length
                ? (remainingReferences ? `Generate next ${Math.min(BOARD_SIZE, remainingReferences)}` : 'All references explored')
                : `Generate ${Math.min(BOARD_SIZE, referenceLikes.length)} concepts`)}
            </button>
          </div>
        </div>

        {/* What the six will be drawn from — visible so a surprising result is
            traceable to the brief rather than mysterious. Each pairing is a
            distinct direction: nothing on the board is a blend of two. */}
        <div style={{
          padding:'12px 14px',borderRadius:12,background:'var(--bg-elev)',
          boxShadow:'inset 0 0 0 1px var(--line)',display:'flex',
          flexDirection:'column',gap:9,
        }}>
          <div style={{fontSize:11,color:'var(--fg-3)',lineHeight:1.5}}>
            Each batch uses the next {BOARD_SIZE} liked references in order. Every
            sketch applies one reference&apos;s visual principles to an original mark;
            nothing copies the existing logo.
          </div>
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            {plan.map((p, i) => (
              <span key={i} style={{
                display:'inline-flex',alignItems:'center',gap:6,padding:'4px 9px',
                borderRadius:99,background:'var(--bg-sunken)',fontSize:11,color:'var(--fg-2)',
              }}>
                <span style={{fontFamily:'var(--font-mono)',fontSize:10,color:'var(--fg-4)'}}>×{p.count}</span>
                {p.styleName} · {p.typeName}
              </span>
            ))}
          </div>
        </div>

        {!briefReady && (
          <div role="status" style={{
            padding:'14px 16px',borderRadius:12,background:'var(--bg-elev)',
            boxShadow:'inset 0 0 0 1px var(--line)',fontSize:12.5,color:'var(--fg-2)',
          }}>
            {hasBrief
              ? (!requestTypes.length
                ? 'Choose at least one logo type before drawing concepts.'
                : 'Like at least one reference before drawing concepts.')
              : 'Add a brand description in the brief before drawing concepts.'}
          </div>
        )}

        {notice && (
          <div role="status" style={{
            padding:'12px 14px',borderRadius:12,background:'var(--bg-elev)',
            boxShadow:'inset 0 0 0 1px var(--line)',fontSize:12.5,color:'var(--fg-2)',
          }}>{notice}</div>
        )}

        {error && (
          <div role="alert" style={{
            padding:'12px 14px',borderRadius:12,background:'rgba(253,121,71,.10)',
            boxShadow:'inset 0 0 0 1px rgba(253,121,71,.30)',fontSize:12.5,color:'#A8421F',
            display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap',
          }}>
            <span>{error}</span>
            <button type="button" onClick={() => draw()} style={{
              padding:'5px 10px',borderRadius:8,background:'#000',color:'#fff',
              fontSize:11.5,fontWeight:600,border:0,cursor:'pointer',
            }}>Try again</button>
          </div>
        )}

        {assetError && !error && (
          <div role="alert" style={{
            padding:'12px 14px',borderRadius:12,background:'rgba(253,121,71,.10)',
            boxShadow:'inset 0 0 0 1px rgba(253,121,71,.30)',fontSize:12.5,color:'#A8421F',
            display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap',
          }}>
            <span>Some concept images could not load.</span>
            <button type="button" onClick={repairImages} disabled={loading} style={{
              padding:'5px 10px',borderRadius:8,background:'#000',color:'#fff',fontSize:11.5,
              fontWeight:600,border:0,cursor:loading ? 'default' : 'pointer',opacity:loading ? .6 : 1,
            }}>{loading ? 'Repairing…' : 'Repair images'}</button>
          </div>
        )}

        {board.length === 0 && !loading && briefReady && !error && (
          <div style={{
            padding:'48px 24px',textAlign:'center',borderRadius:16,
            background:'var(--bg-elev)',boxShadow:'inset 0 0 0 1px var(--line)',
          }}>
            <div style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:16,color:'#000'}}>
              Nothing drawn yet.
            </div>
            <div style={{fontSize:12.5,color:'var(--fg-3)',marginTop:6,lineHeight:1.5,maxWidth:440,margin:'6px auto 0'}}>
              These are rough pencil sketches, not finished logos — you’re choosing
              an idea to develop, so don’t judge the drawing. Sketch a board, like
              what interests you, and generate the next six if nothing lands.
            </div>
          </div>
        )}

        {(board.length > 0 || loading) && (
          <div className="home-grid-3" style={{display:'grid',gap:12}}>
            {board.map((s: any) => (
              <ASketchCard key={s.id} sketch={s} liked={likes.includes(s.id)} onLike={() => toggleLike(s.id)} onImageError={() => setAssetError(true)} />
            ))}
            {loading && Array.from({ length: BOARD_SIZE }).map((_, i) => (
              <div key={`pending-${i}`} style={{
                background:'var(--bg-elev)',borderRadius:16,minHeight:196,
                boxShadow:'inset 0 0 0 1px var(--line)',
                display:'flex',alignItems:'center',justifyContent:'center',
              }}>
                {/* One spinner for the set, not six — six spinners read as
                    six separate waits when it is really one. */}
                {i === 0 ? (
                  <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8,padding:12,textAlign:'center'}}>
                    <Thinking/>
                    <span style={{fontSize:11,color:'var(--fg-4)',lineHeight:1.4}}>{busyLabel}</span>
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

