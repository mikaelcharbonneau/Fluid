"use client";

// Extracted from the original single-file Prototype.tsx as part of #175's
// route split. The code below is unchanged; only the import/export header
// around it is new.

import React from "react";
import { apiAssist } from "../_kit/api";
import { SearchIcon } from "../_kit/shell";
import { Sparkle } from "../_kit/ui";
import { ACompetitorChip, AFieldCard, AWizardLayout } from "../_kit/wizard";
import { useBrandDraft } from "../_state/brand-draft-context";
import { useRouter } from "../_state/router-context";

export const DirA_Step1_Brief = () => {
  const { draft, setField } = useBrandDraft();
  const { navigate } = useRouter();
  const brief = (draft && draft.brief) || '';
  // The description is the one thing every later step reads. Audience and
  // competitors are marked optional on the cards and are genuinely optional
  // here too — gating on them would contradict the label.
  const briefReady = brief.trim().length > 0;
  const audience = (draft && draft.audience) || '';
  // Competitors are stored as a comma-separated string; edit them as chips.
  const competitors = ((draft && draft.competitors) || '')
    .split(',').map((s: any) => s.trim()).filter(Boolean);
  const [compInput, setCompInput] = React.useState('');
  const addCompetitor = (raw: any) => {
    const v = String(raw || '').trim().replace(/,+$/, '').trim();
    if (!v) return;
    if (competitors.some((c: any) => c.toLowerCase() === v.toLowerCase())) { setCompInput(''); return; }
    setField('competitors', [...competitors, v].join(', '));
    setCompInput('');
  };
  const removeCompetitor = (name: any) => {
    setField('competitors', competitors.filter((c: any) => c !== name).join(', '));
  };

  // Inline AI assists. `assisting` holds the task id currently running.
  const brandId = draft && draft.id;
  const hasBrief = !!String(brief).trim();
  const [assisting, setAssisting] = React.useState('');
  const [assistErr, setAssistErr] = React.useState('');
  const runAssist = async (task: any) => {
    if (!brandId || assisting) return;
    if (!hasBrief) { setAssistErr('Add a brand description first.'); return; }
    setAssisting(task); setAssistErr('');
    const { result, error } = await apiAssist(brandId, task);
    if (error) setAssistErr(error);
    else if (result) {
      if (task === 'audience' && result.text) setField('audience', result.text);
      else if (task === 'competitors' && result.items) {
        const merged = [...competitors];
        result.items.forEach((it: any) => { if (it && !merged.some((c) => c.toLowerCase() === it.toLowerCase())) merged.push(it); });
        setField('competitors', merged.join(', '));
      } else if (result.text) setField('brief', result.text);
    }
    setAssisting('');
  };
  const pill = { padding:'5px 10px', borderRadius:8, background:'var(--bg-sunken)', color:'var(--fg-2)', fontSize:11, fontWeight:600, display:'inline-flex', alignItems:'center', gap:6, border:0, cursor:'pointer' };
  const busy = (t: any) => assisting === t;

  return (
  <AWizardLayout
    step={1}
    title="Tell us about your idea."
    subtitle="A short description is enough to get started — Fluid handles the rest."
    status="Draft"
    progress="Step 1 of 5"
    nextLabel="Continue to Name"
    dockCopy={briefReady
      ? 'Ready. Naming builds on this description.'
      : 'Describe the brand in a sentence or two to continue.'}
    nextDisabled={!briefReady}
    onNext={() => { if (briefReady) navigate('step2'); }}
    isThinking={false}
  >
    <div style={{display:'flex', flexDirection:'column', gap:14}}>
      {/* 01 · Brand description — the hero field */}
      <AFieldCard n="01" title="Brand description" meta="184 / 800">
        <div style={{
          position:'relative',
          background: 'var(--bg)', borderRadius: 14,
          boxShadow:'inset 0 0 0 1px var(--line)',
          padding: '18px 18px 14px',
        }}>
          <textarea
            value={brief}
            onChange={(e) => setField('brief', e.target.value)}
            placeholder="A productivity tool for founders who run on rituals — not roadmaps. Daily focus prompts, weekly retros, monthly themes — all in one quiet surface."
            rows={3}
            style={{
              width:'100%', resize:'vertical', border:'none', outline:'none', background:'transparent',
              fontFamily:'var(--font-display)', fontSize: 22, fontWeight: 500,
              letterSpacing:'-0.018em', color:'#000', lineHeight: 1.4,
              minHeight: 84,
            }}
          />
          <div style={{display:'flex', alignItems:'center', gap:8, marginTop:14, paddingTop:14, borderTop:'1px dashed var(--line)'}}>
            <button onClick={() => runAssist('brief_shorter')} disabled={!!assisting} style={{...pill, opacity: assisting && !busy('brief_shorter') ? 0.5 : 1}}>
              <Sparkle size={11}/> {busy('brief_shorter') ? 'Rewriting…' : 'Rewrite shorter'}
            </button>
            <button onClick={() => runAssist('brief_punchier')} disabled={!!assisting} style={{...pill, opacity: assisting && !busy('brief_punchier') ? 0.5 : 1}}>{busy('brief_punchier') ? 'Working…' : 'Make it punchier'}</button>
            <button onClick={() => runAssist('brief_sharper')} disabled={!!assisting} style={{...pill, opacity: assisting && !busy('brief_sharper') ? 0.5 : 1}}>{busy('brief_sharper') ? 'Working…' : 'Sharpen the angle'}</button>
            <div style={{flex:1}}/>
            <span style={{fontSize:10.5,color:'var(--fg-4)',fontFamily:'var(--font-mono)'}}>⌘↵ to continue</span>
          </div>
          {assistErr && <div style={{marginTop:10, fontSize:11.5, color:'#A8421F'}}>{assistErr}</div>}
        </div>
      </AFieldCard>

      {/* 02 · Audience and 03 · Competitors — both optional */}
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:14}}>
        <AFieldCard n="02" title="Audience" optional>
          <div style={{
            background:'var(--bg)', borderRadius: 14,
            boxShadow:'inset 0 0 0 1px var(--line)',
            padding:'14px 16px',
            display:'flex', flexDirection:'column', gap:10,
            minHeight: 124,
          }}>
            <textarea
              value={audience}
              onChange={(e) => setField('audience', e.target.value)}
              placeholder="Solo founders & indie makers, 25–40, already living in Notion, Linear, or Sunsama."
              rows={3}
              style={{
                width:'100%', resize:'vertical', border:'none', outline:'none', background:'transparent',
                fontFamily:'var(--font-display)', fontSize:16, fontWeight:500,
                letterSpacing:'-0.012em', color:'var(--fg-1)', lineHeight:1.45,
              }}
            />
            <div style={{flex:1}}/>
          </div>
          <div style={{display:'flex', alignItems:'center', gap:8}}>
            <button onClick={() => runAssist('audience')} disabled={!!assisting} style={{...pill, opacity: assisting && !busy('audience') ? 0.5 : 1}}>
              <Sparkle size={11}/> {busy('audience') ? 'Suggesting…' : 'Suggest from description'}
            </button>
            <div style={{flex:1}}/>
            <span style={{fontSize:10.5,color:'var(--fg-4)'}}>Helps tone &amp; visual register</span>
          </div>
        </AFieldCard>

        <AFieldCard n="03" title="Competitors" optional>
          <div style={{
            background:'var(--bg)', borderRadius: 14,
            boxShadow:'inset 0 0 0 1px var(--line)',
            padding:'14px 14px',
            display:'flex', flexDirection:'column', gap:12,
            minHeight: 124,
          }}>
            <div style={{display:'flex', flexWrap:'wrap', gap:6}}>
              {competitors.map((c: any) => (
                <ACompetitorChip key={c} name={c} onRemove={() => removeCompetitor(c)} />
              ))}
            </div>
            <div style={{flex:1}}/>
            <div style={{
              display:'flex', alignItems:'center', gap:8,
              padding:'8px 10px', borderRadius: 10,
              boxShadow:'inset 0 0 0 1px var(--line)',
              background: 'var(--bg-elev)',
            }}>
              <SearchIcon size={12}/>
              <input
                value={compInput}
                onChange={(e) => setCompInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCompetitor(e.currentTarget.value); } }}
                placeholder="Add a competitor by name or URL…"
                style={{flex:1, border:0, background:'transparent', outline:'none', fontSize:12.5, color:'var(--fg-2)', fontFamily:'inherit'}}
              />
              <span style={{fontSize:10,color:'var(--fg-4)',fontFamily:'var(--font-mono)'}}>↵</span>
            </div>
          </div>
          <div style={{display:'flex', alignItems:'center', gap:8}}>
            <button onClick={() => runAssist('competitors')} disabled={!!assisting} style={{...pill, opacity: assisting && !busy('competitors') ? 0.5 : 1}}>
              <Sparkle size={11}/> {busy('competitors') ? 'Suggesting…' : 'Suggest 3 more'}
            </button>
            <div style={{flex:1}}/>
            <span style={{fontSize:10.5,color:'var(--fg-4)'}}>Helps positioning &amp; differentiation</span>
          </div>
        </AFieldCard>
      </div>
    </div>
  </AWizardLayout>
  );
};

