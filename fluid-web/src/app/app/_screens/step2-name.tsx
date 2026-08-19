"use client";

// Extracted from the original single-file Prototype.tsx as part of #175's
// route split. The code below is unchanged; only the import/export header
// around it is new.

import React from "react";
import { CARD_BUTTON_RESET } from "../_kit/a11y";
import { signalBalanceChanged } from "../_kit/api";
import { resolveBrandName } from "../_kit/brand";
import { Sparkle, Thinking } from "../_kit/ui";
import { AWizardLayout } from "../_kit/wizard";
import { useBrandDraft } from "../_state/brand-draft-context";
import { useRouter } from "../_state/router-context";

// =====================================================================
// A4 · Step 2 · Name Generation Screen
// 9 name cards in a 3×3 grid. Each card carries the name as the
// hero, a one-line rationale, domain status, and a fit-score bar so
// the agent's reasoning is legible at a glance. Selected card gets a
// black ring; favorited cards get a coral heart.
// =====================================================================
// Compact name card — just the name, selectable, with a like (heart) toggle.
const ANameCard = ({ n, sel, liked, onClick, onLike }: any) => (
  <div style={{
    position:'relative', background:'var(--bg-elev)', borderRadius:12,
    minHeight:58,
    boxShadow: sel ? '0 0 0 2px #000, var(--shadow-sm)' : 'var(--shadow-xs), inset 0 0 0 1px var(--line)',
    display:'flex', alignItems:'center',
  }}>
    <button type="button" onClick={onClick} aria-pressed={!!sel} style={{
      ...CARD_BUTTON_RESET,
      padding:'16px 30px 16px 14px', minHeight:58,
      display:'flex', alignItems:'center', cursor:'pointer',
      fontFamily:'var(--font-display)', fontWeight:700, fontSize:17,
      letterSpacing:'-0.02em', color:'#000',
      overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'100%',
    }}>{n}</button>
    <button onClick={onLike} aria-label={liked ? 'Unlike ' + n : 'Like ' + n} aria-pressed={!!liked} style={{
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

const NAME_STYLE_LIMIT = 3;

const NAME_STYLE_OPTIONS = [
  { id: 'ai', label: 'Let AI choose', description: 'Fluid finds the strongest naming territory for the brief.', ai: true },
  { id: 'evocative', label: 'Evocative', description: 'Red Bull, Forever 21' },
  { id: 'compound', label: 'Compound words', description: 'FedEx, Microsoft' },
  { id: 'non_english', label: 'Non-English words', description: 'Toyota, Audi, Uber' },
  { id: 'brandable', label: 'Brandable names', description: 'Google, Rolex' },
  { id: 'short_phrase', label: 'Short phrase', description: 'Dollar Shave Club' },
  { id: 'alternate_spelling', label: 'Alternate spelling', description: 'Lyft, Fiverr' },
  { id: 'real_words', label: 'Real words', description: 'Apple, Amazon' },
];

const ANameStyleOption = ({ option, selected, disabled, onClick }: any) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-pressed={selected}
    style={{
      minHeight:104,padding:'14px 15px',borderRadius:10,textAlign:'left',cursor:disabled ? 'not-allowed' : 'pointer',
      border:selected ? '2px solid #000' : '1px solid var(--line)',
      background:selected ? '#fff' : 'var(--bg)',
      boxShadow:selected ? '0 7px 16px rgba(0,0,0,.08)' : 'none',
      opacity:disabled ? .45 : 1,display:'flex',flexDirection:'column',justifyContent:'space-between',gap:8,
    }}
  >
    <span style={{display:'inline-flex',alignItems:'center',gap:7,fontFamily:'var(--font-display)',fontSize:15,fontWeight:700,color:'#000'}}>
      {option.ai && <Sparkle size={13} color="#C77D14"/>}
      {option.label}
    </span>
    <span style={{fontSize:11,color:'var(--fg-3)',lineHeight:1.35}}>{option.description}</span>
  </button>
);

export const DirA_Step2_Name = () => {
  const { draft, setField, setData } = useBrandDraft();
  const { navigate } = useRouter();
  const data = (draft && draft.data) || {};
  // Resolved, not raw name_choice: a brand whose chosen name only survived in
  // `name` should still show that name selected here rather than looking as
  // though nothing was ever picked.
  const chosen = resolveBrandName(draft);
  const chooseName = (name: any) => { setField('name_choice', name); setField('name', name); };

  const brandId = draft && draft.id;
  const hasBrief = !!(draft && String(draft.brief || '').trim());
  // Seed from anything cached on the brand (so resuming shows the same set).
  const cachedNames = (draft && draft.data && draft.data.names) || [];
  const cachedLiked = (draft && draft.data && draft.data.liked_names) || [];
  const aiChoosesNameStyle = data.name_generation_style_mode === 'ai';
  const selectedNameStyles = aiChoosesNameStyle ? [] : (Array.isArray(data.name_generation_style_ids) ? data.name_generation_style_ids : []);
  const nameDetails = String(data.name_generation_details || '');
  const [names, setNames] = React.useState(cachedNames);
  const [liked, setLiked] = React.useState(cachedLiked);
  const [likedOpen, setLikedOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  // The "type your own name" input. It's controlled and shows a confirmation
  // once submitted — previously it was uncontrolled with no feedback at all,
  // so a chosen custom name (unlike a chosen grid card) never appeared
  // anywhere in the UI and looked like it had done nothing.
  const [customName, setCustomName] = React.useState(
    chosen && !names.some((o: any) => o.name === chosen) && !liked.includes(chosen) ? chosen : '',
  );
  const customChosen = !!customName.trim() && chosen === customName.trim();
  const submitCustomName = () => {
    const v = customName.trim();
    if (v) chooseName(v);
  };

  // Persist names + liked together, merging onto whatever else is in data.
  const persist = React.useCallback((nextNames: any, nextLiked: any) => {
    setData({ names: nextNames, liked_names: nextLiked });
  }, [draft, setField]);

  const toggleLike = (name: any) => {
    const next = liked.includes(name) ? liked.filter((x: any) => x !== name) : [...liked, name];
    setLiked(next);
    persist(names, next);
  };

  const toggleNameStyle = (id: any) => {
    const next = selectedNameStyles.includes(id)
      ? selectedNameStyles.filter((style: any) => style !== id)
      : selectedNameStyles.length >= NAME_STYLE_LIMIT ? selectedNameStyles : [...selectedNameStyles, id];
    setData({
      name_generation_style_ids: next,
      name_generation_style_mode: next.length ? 'manual' : null,
    });
  };

  const toggleAiNameStyle = () => {
    setData({
      name_generation_style_ids: [],
      name_generation_style_mode: aiChoosesNameStyle ? null : 'ai',
    });
  };

  // The React Compiler can't statically verify this callback's memoization
  // is safe to preserve (likely because of `persist`'s own definition
  // further up); the dependency list itself is complete and correct, so
  // this is a build-optimization compatibility note, not a runtime bug.
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const generate = React.useCallback(async () => {
    if (!brandId) return;
    setLoading(true); setError('');
    const res = await apiGenerateNames(brandId, {
      styleIds: selectedNameStyles,
      aiChooses: aiChoosesNameStyle,
      details: nameDetails,
    });
    if (res.error) setError(res.error);
    else { setNames(res.names); persist(res.names, liked); }
    setLoading(false);
  }, [aiChoosesNameStyle, brandId, nameDetails, persist, liked, selectedNameStyles]);

  const toolBtn = {
    padding:'10px 14px', borderRadius:12, fontSize:12.5, fontWeight:600,
    display:'inline-flex', alignItems:'center', gap:8, border:0, cursor:'pointer',
  };

  return (
  <AWizardLayout
    step={2}
    title="Guide the name generation."
    subtitle="Choose the naming directions that fit, then let Fluid draft options from your brief."
    status="Draft"
    progress="Step 2 of 5"
    nextLabel="Continue to Logo"
    dockCopy={chosen
      ? `“${chosen}” it is. Set the logo direction next.`
      : 'Choose a name before setting the logo direction.'}
    nextDisabled={!chosen}
    onNext={() => { if (chosen) navigate('step3'); }}
    isThinking={loading}
  >
    <section aria-labelledby="name-guidance-heading" style={{display:'flex',flexDirection:'column',gap:16,marginBottom:24}}>
      <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:16}}>
        <div>
          <div className="eyebrow" style={{color:'var(--fg-3)'}}>Name style</div>
          <h3 id="name-guidance-heading" style={{margin:'6px 0 0',fontFamily:'var(--font-display)',fontSize:20,fontWeight:700,color:'#000',letterSpacing:'-0.015em'}}>What kinds of names should we explore?</h3>
        </div>
        <span style={{fontSize:11.5,color:'var(--fg-3)',fontFamily:'var(--font-mono)',whiteSpace:'nowrap'}}>
          {aiChoosesNameStyle ? 'Fluid chooses' : `${selectedNameStyles.length} / ${NAME_STYLE_LIMIT}`}
        </span>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(4, minmax(0, 1fr))',gap:10}}>
        {NAME_STYLE_OPTIONS.map((option) => (
          <ANameStyleOption
            key={option.id}
            option={option}
            selected={option.ai ? aiChoosesNameStyle : selectedNameStyles.includes(option.id)}
            disabled={!option.ai && !selectedNameStyles.includes(option.id) && selectedNameStyles.length >= NAME_STYLE_LIMIT}
            onClick={() => option.ai ? toggleAiNameStyle() : toggleNameStyle(option.id)}
          />
        ))}
      </div>

      <div>
        <label htmlFor="name-generation-details" style={{display:'block',fontSize:12.5,fontWeight:700,color:'var(--fg-1)',marginBottom:8}}>Additional details</label>
        <textarea
          id="name-generation-details"
          value={nameDetails}
          onChange={(event) => setData({ name_generation_details: event.target.value.slice(0, 500) })}
          maxLength={500}
          rows={3}
          placeholder="Words to avoid, ideas to explore, pronunciation preferences..."
          style={{width:'100%',resize:'vertical',border:'1px solid var(--line)',borderRadius:10,outline:'none',background:'var(--bg)',padding:'12px 14px',fontSize:13,color:'var(--fg-1)',fontFamily:'inherit',lineHeight:1.5,boxSizing:'border-box'}}
        />
      </div>

      <div style={{display:'flex',justifyContent:'flex-end'}}>
        <button type="button" onClick={() => !loading && generate()} disabled={loading || !brandId} style={{
          ...toolBtn,background:'#000',color:'#fff',cursor:loading || !brandId ? 'default' : 'pointer',opacity:loading || !brandId ? .6 : 1,
        }}>
          <Sparkle size={12} color="#fff"/> {loading ? 'Generating names…' : names.length ? 'Regenerate names' : 'Generate names'}
        </button>
      </div>
    </section>

    {/* Top toolbar — own name and liked names */}
    <div style={{display:'flex', gap:10, alignItems:'center', marginBottom:16}}>
      <div style={{
        flex:1, display:'flex', alignItems:'center', gap:10,
        background:'var(--bg-elev)', borderRadius:12,
        boxShadow: customChosen ? 'inset 0 0 0 1.5px #000' : 'var(--shadow-xs), inset 0 0 0 1px var(--line)',
        padding:'10px 14px',
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--fg-3)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v16M4 12h16"/></svg>
        <input
          placeholder="Type your own name…"
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submitCustomName(); }}
          onBlur={submitCustomName}
          style={{flex:1, border:0, background:'transparent', outline:'none', fontSize:13, color:'var(--fg-1)', fontFamily:'inherit'}}
        />
        {customChosen ? (
          <span style={{display:'inline-flex', alignItems:'center', gap:4, fontSize:10.5, fontWeight:600, color:'#000'}}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            Selected
          </span>
        ) : (
          <span style={{fontSize:10.5, color:'var(--fg-4)', fontFamily:'var(--font-mono)'}}>↵</span>
        )}
      </div>
      <button onClick={() => setLikedOpen((o) => !o)} style={{
        ...toolBtn, background:'var(--bg-elev)', color:'var(--fg-1)',
        boxShadow:'var(--shadow-xs), inset 0 0 0 1px ' + (likedOpen ? '#000' : 'var(--line)'),
      }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill={liked.length ? '#FD7947' : 'none'} stroke={liked.length ? '#FD7947' : 'var(--fg-2)'} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        Liked Names{liked.length ? ' (' + liked.length + ')' : ''}
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
            {liked.map((name: any) => {
              const sel = chosen === name;
              return (
                <div key={name} style={{
                  display:'inline-flex', alignItems:'center', gap:8,
                  borderRadius:99, padding:'6px 6px 6px 14px',
                  background: sel ? '#000' : 'var(--bg)',
                  boxShadow: sel ? 'none' : 'inset 0 0 0 1px var(--line)',
                }}>
                  <button type="button" onClick={() => chooseName(name)} aria-pressed={sel} style={{...CARD_BUTTON_RESET, width:'auto', fontFamily:'var(--font-display)', fontWeight:700, fontSize:14, color: sel ? '#fff' : '#000', cursor:'pointer'}}>{name}</button>
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
        {names.map((o: any) => (
          <ANameCard key={o.name} n={o.name}
            sel={chosen === o.name} liked={liked.includes(o.name)}
            onClick={() => chooseName(o.name)} onLike={() => toggleLike(o.name)} />
        ))}
      </div>
    )}
  </AWizardLayout>
  );
};

// Phase 3 — ask OpenAI for name candidates for this brand. Resolves to
// { names } on success or { error } so the caller can show a message.
async function apiGenerateNames(brandId: any, guidance: any) {
  try {
    const r = await fetch('/api/generate/names', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brandId, guidance }),
    });
    const j = await r.json().catch(() => ({}));
    signalBalanceChanged(j.code);
    if (!r.ok) return { error: j.error || 'Generation failed.', code: j.code };
    return { names: j.names || [] };
  } catch { return { error: 'Network error.' }; }
}

