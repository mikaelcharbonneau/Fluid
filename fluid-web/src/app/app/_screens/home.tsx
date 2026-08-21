"use client";

// Extracted from the original single-file Prototype.tsx as part of #175's
// route split, then reworked so the page opens on a composer rather than a
// hero card: the fastest path to a brand is typing the sentence you already
// have in mind, not picking a tile.

import React from "react";
import { CARD_BUTTON_RESET } from "../_kit/a11y";
import { BA_CardVisual, brandDisplayName, isBrandKitBrand } from "../_kit/brand";
import { QUICK_VISUAL_MODES } from "../_kit/collage";
import { AShell, CHAT } from "../_kit/shell";
import { ArrowRight } from "../_kit/ui";
import { useBrandDraft } from "../_state/brand-draft-context";
import { useRouter } from "../_state/router-context";

export const DirA_Home = () => {
  const { user, brands, billing } = useBrandDraft();
  const { navigate } = useRouter();
  const drafts = brands.filter((b: any) => b.status === 'draft');
  const firstRun = brands.length === 0;
  // The card row is "what you were last working on". Unfinished brands are the
  // point of it, but a user whose brands are all finished should still land on
  // their work rather than an empty page under the hero.
  const recent = drafts.length > 0 ? drafts : brands;
  const startBalance = (billing && typeof billing.balance === 'number') ? billing.balance : 20;
  const firstName = user && user.name ? user.name.trim().split(/\s+/)[0] : 'there';
  const now = new Date();
  const hour = now.getHours();
  const partOfDay = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
  const todayMono = now
    .toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
    .toUpperCase();

  const [prompt, setPrompt] = React.useState('');
  const [modesOpen, setModesOpen] = React.useState(false);

  // The composer hands its sentence to the chat as ?brief=, which pre-fills the
  // first step rather than asking for something the user already typed.
  const startChat = (text: string, mode?: string) => {
    const params: string[] = [];
    const q = String(text || '').trim();
    if (q) params.push('brief=' + encodeURIComponent(q));
    if (mode) params.push('mode=' + encodeURIComponent(mode));
    location.assign(params.length ? CHAT + '?' + params.join('&') : CHAT);
  };

  // Only the five-step wizard has a step count to show. Brand-kit conversations
  // and the logo-only path get their stage as a label, with no invented ratio.
  const cardProgress = (b: any): { label: string; pct: number | null } => {
    if (b.status !== 'draft') return { label: 'Complete', pct: 100 };
    if (isBrandKitBrand(b)) return { label: 'In progress', pct: null };
    return { label: 'Archived workflow', pct: null };
  };

  return (
<AShell activeNav="home" breadcrumb={['Home']}>

    {/* ════ HERO — greeting, composer, seeds ═══════════════════════════ */}
    <section className="home-hero" style={{
      position: 'relative', minHeight: 520, padding: '72px 72px 76px',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', boxSizing: 'border-box', overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 26 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(0,0,0,.58)' }}>{todayMono}</span>
        <span style={{ width: 3, height: 3, borderRadius: 99, background: 'rgba(0,0,0,.34)' }} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(0,0,0,.58)' }}>{startBalance} tokens</span>
      </div>

      <h1 className="home-hero-title" style={{
        fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 64,
        letterSpacing: '-0.046em', lineHeight: 0.98, margin: 0, color: '#000',
        textAlign: 'center', textWrap: 'balance',
      }}>Good {partOfDay}, {firstName}.</h1>

      <p style={{
        fontSize: 17, color: 'rgba(0,0,0,.62)', margin: '18px 0 34px',
        maxWidth: '46ch', lineHeight: 1.5, textAlign: 'center', textWrap: 'pretty',
      }}>A sentence is all Fluid needs. Strategy, name, palette, type and mark — drafted in about a minute.</p>

      {/* Composer — the primary way into a new brand */}
      <div className="home-composer" style={{
        width: '100%', maxWidth: 760, borderRadius: 22, background: '#fff',
        boxShadow: '0 24px 60px rgba(0,0,0,.18), inset 0 0 0 1px rgba(0,0,0,.06)',
        padding: '20px 20px 14px', boxSizing: 'border-box',
        display: 'flex', flexDirection: 'column', gap: 14,
      }}>
        <textarea
          aria-label="Describe the brand you want"
          rows={2}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); startChat(prompt); }
          }}
          placeholder={'Describe the brand you want — “a cold-brew coffee subscription for night-shift nurses”'}
          style={{
            width: '100%', border: 0, outline: 'none', resize: 'none', background: 'transparent',
            font: 'inherit', fontSize: 17, lineHeight: 1.45, color: '#0E0F12', boxSizing: 'border-box',
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', minWidth: 0, flex: '1 1 auto' }}>
            <button type="button" onClick={() => setModesOpen((v) => !v)} className="home-chip" aria-expanded={modesOpen} style={{
              display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 13px', borderRadius: 999,
              background: modesOpen ? '#E9E9EC' : '#F5F5F6', color: 'rgba(0,0,0,.72)',
              font: 'inherit', fontSize: 12.5, fontWeight: 600, border: 0, cursor: 'pointer',
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor" stroke="none" /></svg>
              Look &amp; feel
            </button>
            <button type="button" onClick={() => navigate('brands')} className="home-chip" style={{
              display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 13px', borderRadius: 999,
              background: '#F5F5F6', color: 'rgba(0,0,0,.72)', font: 'inherit', fontSize: 12.5,
              fontWeight: 600, border: 0, cursor: 'pointer',
            }}>Browse templates</button>
          </div>
          <button type="button" onClick={() => startChat(prompt)} aria-label="Start" style={{
            width: 42, height: 42, borderRadius: 999, background: '#0E0F12', color: '#fff',
            border: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center',
            justifyContent: 'center', flex: '0 0 auto', boxShadow: '0 8px 20px rgba(0,0,0,.24)',
          }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" /></svg>
          </button>
        </div>

        {/* Look & feel — the existing visual modes, carried through as ?mode= */}
        {modesOpen && (
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', paddingTop: 2, borderTop: '1px solid var(--line)', marginTop: 2 }}>
            {QUICK_VISUAL_MODES.map((m) => (
              <button key={m.id} type="button" onClick={() => startChat(prompt, m.id)} className="home-chip" style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 999,
                background: '#F5F5F6', color: 'rgba(0,0,0,.72)', font: 'inherit', fontSize: 12,
                fontWeight: 600, border: 0, cursor: 'pointer', marginTop: 10,
              }}>{m.icon} {m.title}</button>
            ))}
          </div>
        )}
      </div>

      {/* Seed prompts — one tap to a filled brief */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 18, flexWrap: 'wrap', justifyContent: 'center' }}>
        {[
          'Cold-brew coffee subscription',
          'Marketplace for lighting designers',
          'Notebook app for ecologists',
        ].map((label) => (
          <button key={label} type="button" onClick={() => startChat(label)} className="home-seed" style={{
            padding: '8px 14px', borderRadius: 999, background: 'rgba(255,255,255,.62)',
            color: '#0E0F12', font: 'inherit', fontSize: 12.5, fontWeight: 600,
            border: 0, cursor: 'pointer', backdropFilter: 'blur(6px)',
          }}>{label}</button>
        ))}
      </div>
    </section>

    <div className="home-body" style={{ padding: '48px 72px 88px', display: 'flex', flexDirection: 'column', gap: 56, boxSizing: 'border-box' }}>

      {/* ════ FIRST-RUN ONBOARDING — only until the first brand exists ══ */}
      {firstRun && (
      <section style={{
        position: 'relative', background: '#0E0F12', color: '#fff',
        borderRadius: 24, padding: '34px 40px', overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 11px', borderRadius: 99, background: 'rgba(255,255,255,.1)' }}>
            <span style={{ width: 12, height: 12, borderRadius: 99, background: 'var(--fluid-gradient)' }} />
            <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,.85)' }}>Getting started</span>
          </span>
          <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,.7)' }}>
            You have <strong style={{ color: '#fff' }}>{startBalance} free tokens</strong> — enough for your first full brand.
          </span>
        </div>
        {/* Explicit white: this panel is dark, and without a colour the
            heading inherited --fg-1 (black) and rendered at 1.09:1 against
            the panel — effectively invisible (#171). */}
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 30, letterSpacing: '-0.03em', lineHeight: 1.05, margin: '0 0 20px', maxWidth: 560, color: '#fff' }}>
          Three steps from a sentence to a brand.
        </h2>
        <div className="home-grid-3" style={{ display: 'grid', gap: 18 }}>
          {[
            { n: '1', t: 'Describe your idea', d: 'One sentence is all Fluid needs to get going.' },
            { n: '2', t: 'Generate the identity', d: 'Names, palette, type and a logo — drafted in seconds. Each asset costs 3 tokens.' },
            { n: '3', t: 'Refine & export', d: 'Tweak anything, export the assets, or subscribe for a monthly token refill.' },
          ].map((s) => (
            <div key={s.n} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ width: 26, height: 26, borderRadius: 99, background: 'rgba(255,255,255,.12)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12.5, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{s.n}</span>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, letterSpacing: '-0.015em' }}>{s.t}</div>
              <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,.66)', lineHeight: 1.45 }}>{s.d}</div>
            </div>
          ))}
        </div>
      </section>
      )}

      {/* ════ PICK UP WHERE YOU LEFT OFF ═════════════════════════════════ */}
      {recent.length > 0 && (
      <section>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, marginBottom: 20 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(0,0,0,.34)', marginBottom: 10 }}>{drafts.length > 0 ? 'In progress' : 'Recent'}</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 30, letterSpacing: '-0.03em', lineHeight: 1, margin: 0, color: '#000' }}>{drafts.length > 0 ? 'Pick up where you left off.' : 'Your brands.'}</h2>
          </div>
          <button type="button" onClick={() => navigate('brands')} style={{
            padding: '9px 15px', borderRadius: 10, background: '#fff',
            boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.10)', color: 'rgba(0,0,0,.72)',
            font: 'inherit', fontSize: 12.5, fontWeight: 600, border: 0, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 7, flex: '0 0 auto',
          }}>All brands <ArrowRight size={12} /></button>
        </div>

        <div className="home-grid-3" style={{ display: 'grid', gap: 18 }}>
          {recent.slice(0, 3).map((b: any) => {
            const prog = cardProgress(b);
            const brief = (b.data && b.data.brief) || '';
            // A finished kit board already carries the wordmark. Overlaying the
            // name on top doubles the identity and buries it in artwork, so
            // those cards name themselves in the body instead and drop the
            // scrim, which exists only to keep an overlaid name legible.
            const hasBoard = !!(b.data && b.data.brandkit && b.data.brandkit.imageUrl);
            return (
            // #171: a real button, so the card is reachable by keyboard and
            // announced. CARD_BUTTON_RESET strips the UA styling first.
            <button type="button" key={b.id} className="b-card"
              onClick={() => {
                // Same distinction as the Brands page: a brand-kit
                // conversation resumes at its own URL, not the legacy wizard.
                location.assign(CHAT + '?brand=' + b.id);
              }}
              style={{ ...CARD_BUTTON_RESET, borderRadius: 18, overflow: 'hidden', cursor: 'pointer', background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,.06), inset 0 0 0 1px rgba(0,0,0,.10)' }}>

              <span className={'b-thumb' + (hasBoard ? ' b-thumb--plain' : '')} style={{ display: 'block', position: 'relative', height: 120 }}>
                <BA_CardVisual brand={b} height={120} />
                {!hasBoard && (
                <span style={{
                  position: 'absolute', left: 14, right: 14, bottom: 14, zIndex: 1,
                  fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 800,
                  letterSpacing: '-0.035em', color: '#fff', lineHeight: 1,
                  textShadow: '0 2px 10px rgba(0,0,0,.35)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{brandDisplayName(b)}</span>
                )}
              </span>

              <span style={{ display: 'flex', padding: '16px 18px 18px', flexDirection: 'column', gap: 12 }}>
                {hasBoard && (
                <span style={{ display: 'block', fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, letterSpacing: '-0.025em', color: '#000', lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {brandDisplayName(b)}
                </span>
                )}
                <span style={{ display: 'block', fontSize: 13, color: 'rgba(0,0,0,.52)', lineHeight: 1.45, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {brief || ' '}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {prog.pct !== null && (
                    <span style={{ flex: 1, height: 2, background: '#F0F0F2', display: 'flex' }}>
                      <span style={{ width: prog.pct + '%', background: 'var(--fl-accent)' }} />
                    </span>
                  )}
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'rgba(0,0,0,.34)', marginLeft: prog.pct === null ? 0 : undefined }}>{prog.label}</span>
                </span>
              </span>
            </button>
            );
          })}
        </div>
      </section>
      )}

    </div>
  </AShell>
  );
};
