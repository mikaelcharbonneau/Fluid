"use client";

// Extracted from the original single-file Prototype.tsx as part of #175's
// route split. The code below is unchanged; only the import/export header
// around it is new.

import React from "react";
import { apiAssist } from "../_kit/api";
import { resolveBrandName } from "../_kit/brand";
import { ALogoWizardLayout } from "../_kit/logo-flow";
import { SearchIcon } from "../_kit/shell";
import { Sparkle } from "../_kit/ui";
import { ACompetitorChip, AFieldCard } from "../_kit/wizard";
import { useBrandDraft } from "../_state/brand-draft-context";
import { useRouter } from "../_state/router-context";

export const DirA_LogoBrief = () => {
  const { draft, setField, setData } = useBrandDraft();
  const { navigate } = useRouter();
  const data = (draft && draft.data) || {};
  const name = (draft && (draft.name_choice || resolveBrandName(draft))) || '';
  const brief = (draft && draft.brief) || '';
  const tagline = String(data.logo_tagline || '');
  const nameMeaning = String(data.logo_name_meaning || '');
  const audience = (draft && draft.audience) || '';
  const competitors = ((draft && draft.competitors) || '')
    .split(',').map((s: any) => s.trim()).filter(Boolean);
  const [compInput, setCompInput] = React.useState('');
  const [assisting, setAssisting] = React.useState('');
  const [assistErr, setAssistErr] = React.useState('');

  const setName = (value: any) => {
    setField('name_choice', value);
    setField('name', value);
  };
  const setTagline = (value: any) => setData({ logo_tagline: value });
  const setNameMeaning = (value: any) => setData({ logo_name_meaning: value });
  const addCompetitor = (raw: any) => {
    const value = String(raw || '').trim().replace(/,+$/, '').trim();
    if (!value) return;
    if (competitors.some((c: any) => c.toLowerCase() === value.toLowerCase())) { setCompInput(''); return; }
    setField('competitors', [...competitors, value].join(', '));
    setCompInput('');
  };
  const removeCompetitor = (value: any) => {
    setField('competitors', competitors.filter((c: any) => c !== value).join(', '));
  };

  const brandId = draft && draft.id;
  const runAssist = async (task: any) => {
    if (!brandId || assisting) return;
    if (!String(brief).trim()) { setAssistErr('Add a brand description first.'); return; }
    setAssisting(task); setAssistErr('');
    const { result, error } = await apiAssist(brandId, task);
    if (error) setAssistErr(error);
    else if (result) {
      if (task === 'competitors' && result.items) {
        const merged = [...competitors];
        result.items.forEach((item: any) => {
          if (item && !merged.some((c) => c.toLowerCase() === item.toLowerCase())) merged.push(item);
        });
        setField('competitors', merged.join(', '));
      } else if (result.text) {
        setField('brief', result.text);
      }
    }
    setAssisting('');
  };

  const pill = {
    padding:'5px 10px',borderRadius:8,background:'var(--bg-sunken)',color:'var(--fg-2)',
    fontSize:11,fontWeight:600,display:'inline-flex',alignItems:'center',gap:6,border:0,cursor:'pointer',
  };
  const busy = (task: any) => assisting === task;
  const canContinue = !!String(name).trim() && !!String(brief).trim();
  const continueToDirection = () => {
    if (canContinue) navigate('logo-direction');
  };
  const shortcut = (event: any) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey) && canContinue) continueToDirection();
  };

  return (
    <ALogoWizardLayout onNext={continueToDirection} nextDisabled={!canContinue}>
      <div style={{display:'flex',flexDirection:'column',gap:14}}>
        <AFieldCard n="01" title="Brand name" meta={name ? `${String(name).length} / 80` : 'Required'}>
          <div style={{
            background:'var(--bg)',borderRadius:14,boxShadow:'inset 0 0 0 1px var(--line)',
            padding:'14px 16px',minHeight:64,display:'flex',alignItems:'center',
          }}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={shortcut}
              maxLength={80}
              aria-label="Brand name"
              placeholder="Cadence"
              autoComplete="off"
              style={{
                width:'100%',border:0,outline:0,background:'transparent',
                fontFamily:'var(--font-display)',fontSize:24,fontWeight:700,
                color:'#000',lineHeight:1.2,
              }}
            />
          </div>
        </AFieldCard>

        {/* Where the name comes from. The single biggest lever on pictorial and
            abstract marks: without it the studio has to guess what to draw, and
            "Cadence" is musical rhythm, cycling cadence, or speech pattern. */}
        <AFieldCard n="02" title="What the name means" optional meta={`${String(nameMeaning).length} / 300`}>
          <div style={{
            background:'var(--bg)',borderRadius:14,boxShadow:'inset 0 0 0 1px var(--line)',
            padding:'16px 18px',
          }}>
            <textarea
              value={nameMeaning}
              onChange={(e) => setNameMeaning(e.target.value)}
              onKeyDown={shortcut}
              maxLength={300}
              aria-label="What the name means or where it comes from"
              placeholder="Named for the rhythm a team finds when it stops sprinting — a steady, repeatable beat rather than a race."
              rows={2}
              style={{
                width:'100%',resize:'vertical',border:'none',outline:'none',background:'transparent',
                fontFamily:'var(--font-display)',fontSize:17,fontWeight:500,
                color:'#000',lineHeight:1.45,minHeight:52,
              }}
            />
          </div>
        </AFieldCard>

        <AFieldCard n="03" title="Brand description" meta={`${String(brief).length} / 800`}>
          <div style={{
            position:'relative',background:'var(--bg)',borderRadius:14,
            boxShadow:'inset 0 0 0 1px var(--line)',padding:'18px 18px 14px',
          }}>
            <textarea
              value={brief}
              onChange={(e) => setField('brief', e.target.value)}
              onKeyDown={shortcut}
              maxLength={800}
              aria-label="Brand description"
              placeholder="A productivity tool for founders who run on rituals, not roadmaps. Daily focus prompts, weekly retros, and monthly themes in one quiet surface."
              rows={3}
              style={{
                width:'100%',resize:'vertical',border:'none',outline:'none',background:'transparent',
                fontFamily:'var(--font-display)',fontSize:22,fontWeight:500,
                color:'#000',lineHeight:1.4,minHeight:84,
              }}
            />
            <div className="logo-assist-row" style={{display:'flex',alignItems:'center',gap:8,marginTop:14,paddingTop:14,borderTop:'1px dashed var(--line)'}}>
              <button type="button" onClick={() => runAssist('brief_shorter')} disabled={!!assisting} style={{...pill,opacity:assisting && !busy('brief_shorter') ? .5 : 1}}>
                <Sparkle size={11}/> {busy('brief_shorter') ? 'Rewriting…' : 'Rewrite shorter'}
              </button>
              <button type="button" onClick={() => runAssist('brief_punchier')} disabled={!!assisting} style={{...pill,opacity:assisting && !busy('brief_punchier') ? .5 : 1}}>
                {busy('brief_punchier') ? 'Working…' : 'Make it punchier'}
              </button>
              <button type="button" onClick={() => runAssist('brief_sharper')} disabled={!!assisting} style={{...pill,opacity:assisting && !busy('brief_sharper') ? .5 : 1}}>
                {busy('brief_sharper') ? 'Working…' : 'Sharpen the angle'}
              </button>
              <div style={{flex:1}}/>
              <span className="logo-shortcut" style={{fontSize:10.5,color:'var(--fg-4)',fontFamily:'var(--font-mono)'}}>⌘↵ to continue</span>
            </div>
            {assistErr && <div role="alert" style={{marginTop:10,fontSize:11.5,color:'#A8421F'}}>{assistErr}</div>}
          </div>
        </AFieldCard>

        {/* Who it's for. Sets the register entirely — the same fintech gets a
            different mark for enterprise CFOs than for 22-year-olds. */}
        <AFieldCard n="04" title="Target audience" optional meta={`${String(audience).length} / 300`}>
          <div style={{
            background:'var(--bg)',borderRadius:14,boxShadow:'inset 0 0 0 1px var(--line)',
            padding:'16px 18px',
          }}>
            <textarea
              value={audience}
              onChange={(e) => setField('audience', e.target.value)}
              onKeyDown={shortcut}
              maxLength={300}
              aria-label="Target audience"
              placeholder="Solo founders and two-person teams in their first year — allergic to process, but quietly worried they're drifting."
              rows={2}
              style={{
                width:'100%',resize:'vertical',border:'none',outline:'none',background:'transparent',
                fontFamily:'var(--font-display)',fontSize:17,fontWeight:500,
                color:'#000',lineHeight:1.45,minHeight:52,
              }}
            />
            <div className="logo-assist-row" style={{display:'flex',alignItems:'center',gap:8,marginTop:12,paddingTop:12,borderTop:'1px dashed var(--line)'}}>
              <button type="button" onClick={() => runAssist('audience')} disabled={!!assisting} style={{...pill,opacity:assisting && !busy('audience') ? .5 : 1}}>
                <Sparkle size={11}/> {busy('audience') ? 'Thinking…' : 'Suggest an audience'}
              </button>
            </div>
          </div>
        </AFieldCard>

        <div className="logo-brief-grid" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
          <AFieldCard n="05" title="Competitors" optional>
            <div style={{
              background:'var(--bg)',borderRadius:14,boxShadow:'inset 0 0 0 1px var(--line)',
              padding:14,display:'flex',flexDirection:'column',gap:12,minHeight:124,
            }}>
              <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                {competitors.map((competitor: any) => (
                  <ACompetitorChip key={competitor} name={competitor} onRemove={() => removeCompetitor(competitor)}/>
                ))}
              </div>
              <div style={{flex:1}}/>
              <div style={{
                display:'flex',alignItems:'center',gap:8,padding:'8px 10px',borderRadius:10,
                boxShadow:'inset 0 0 0 1px var(--line)',background:'var(--bg-elev)',
              }}>
                <SearchIcon size={12}/>
                <input
                  value={compInput}
                  onChange={(e) => setCompInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCompetitor(e.currentTarget.value); } }}
                  aria-label="Add competitor"
                  placeholder="Add a competitor by name or URL…"
                  style={{flex:1,minWidth:0,border:0,background:'transparent',outline:'none',fontSize:12.5,color:'var(--fg-2)',fontFamily:'inherit'}}
                />
                <span style={{fontSize:10,color:'var(--fg-4)',fontFamily:'var(--font-mono)'}}>↵</span>
              </div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <button type="button" onClick={() => runAssist('competitors')} disabled={!!assisting} style={{...pill,opacity:assisting && !busy('competitors') ? .5 : 1}}>
                <Sparkle size={11}/> {busy('competitors') ? 'Suggesting…' : 'Suggest 3 more'}
              </button>
              <div style={{flex:1}}/>
              <span style={{fontSize:10.5,color:'var(--fg-4)'}}>Helps avoid familiar category clichés</span>
            </div>
          </AFieldCard>

          <AFieldCard n="06" title="Tagline" optional meta={`${String(tagline).length} / 120`}>
            <div style={{
              background:'var(--bg)',borderRadius:14,boxShadow:'inset 0 0 0 1px var(--line)',
              padding:'14px 16px',display:'flex',flexDirection:'column',gap:10,minHeight:124,
            }}>
              <textarea
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                onKeyDown={shortcut}
                maxLength={120}
                aria-label="Tagline"
                placeholder="Focus on what moves."
                rows={3}
                style={{
                  width:'100%',resize:'vertical',border:'none',outline:'none',background:'transparent',
                  fontFamily:'var(--font-display)',fontSize:16,fontWeight:500,
                  color:'var(--fg-1)',lineHeight:1.45,
                }}
              />
              <div style={{flex:1}}/>
            </div>
            <div style={{display:'flex',justifyContent:'flex-end'}}>
              <span style={{fontSize:10.5,color:'var(--fg-4)'}}>Context only — it won’t be forced into the logo</span>
            </div>
          </AFieldCard>
        </div>
      </div>
    </ALogoWizardLayout>
  );
};

