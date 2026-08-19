"use client";

// Extracted from the original single-file Prototype.tsx as part of #175's
// route split. The code below is unchanged; only the import/export header
// around it is new.

import React from "react";
import { __assets } from "../_kit/assets";
import { BA_CardVisual, brandDisplayName, isBrandKitBrand } from "../_kit/brand";
import { BrandCollage, QUICK_VISUAL_MODES, QuickPath } from "../_kit/collage";
import { AShell, CHAT } from "../_kit/shell";
import { ArrowRight } from "../_kit/ui";
import { useBrandDraft } from "../_state/brand-draft-context";
import { useRouter } from "../_state/router-context";

export const DirA_Home = () => {
  const { user, brands, loadBrand, billing } = useBrandDraft();
  const { navigate } = useRouter();
  const drafts = brands.filter((b: any) => b.status === 'draft');
  const firstRun = brands.length === 0;
  const startBalance = (billing && typeof billing.balance === 'number') ? billing.balance : 20;
  const firstName = user && user.name ? user.name.trim().split(/\s+/)[0] : 'there';
  const hour = new Date().getHours();
  const partOfDay = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  const progressLine = drafts.length === 0
    ? "You have no brands in progress yet. Start your first one with Fluid."
    : drafts.length === 1
      ? "You have 1 brand in progress. Pick it up, or start something new."
      : "You have " + drafts.length + " brands in progress. Pick one up, or start something new.";
  return (
<AShell activeNav="home" breadcrumb={['Home']}>
    <div className="main-pad" style={{ padding: '48px 56px 64px', display: 'flex', flexDirection: 'column', gap: 40 }}>

      {/* ── Greeting ───────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 32 }}>
        <div>
          <div className="eyebrow" style={{ color: 'var(--fg-3)', marginBottom: 12 }}>{today}</div>
          <h1 style={{
          fontFamily: 'var(--font-display)', fontWeight: 800,
          fontSize: 52, letterSpacing: '-0.04em', lineHeight: 1, margin: 0, color: '#000'
        }}>Good {partOfDay}, {firstName}.</h1>
          <p style={{ fontSize: 16, color: 'var(--fg-2)', marginTop: 14, maxWidth: 520, lineHeight: 1.5 }}>
            {firstRun ? "Welcome to Fluid. Let's turn your first idea into a brand — it takes about a minute." : progressLine}
          </p>
        </div>
      </div>

      {/* ════ FIRST-RUN ONBOARDING — only until the first brand exists ══ */}
      {firstRun && (
      <section style={{
        position: 'relative', background: '#0E0F12', color: '#fff',
        borderRadius: 24, padding: '34px 40px', overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 11px', borderRadius: 99, background: 'rgba(255,255,255,.1)' }}>
            <span style={{ width: 12, height: 12, borderRadius: 99, background: 'var(--fluid-gradient)' }} />
            <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,.85)' }}>Getting started</span>
          </span>
          <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,.7)' }}>
            You have <strong style={{ color: '#fff' }}>{startBalance} free tokens</strong> — enough for your first full brand.
          </span>
        </div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 30, letterSpacing: '-0.03em', lineHeight: 1.05, margin: '0 0 20px', maxWidth: 560 }}>
          Three steps from a sentence to a brand.
        </h2>
        <div className="home-grid-3" style={{ display: 'grid', gap: 18, marginBottom: 26 }}>
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
        <button onClick={() => location.assign(CHAT)} style={{ padding: '12px 22px', borderRadius: 12, background: '#fff', color: '#0E0F12', fontSize: 14, fontWeight: 700, border: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          Create your first brand <ArrowRight size={14} />
        </button>
      </section>
      )}

      {/* ════ YOUR BRANDS — pick up where you left off ════════════════ */}
      {drafts.length > 0 && (
      <section>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16 }}>
          <div className="eyebrow" style={{ color: 'var(--fg-3)' }}>Pick up where you left off</div>
          <button onClick={() => navigate('brands')} style={{ padding: '7px 12px', borderRadius: 10, background: 'transparent', color: 'var(--fg-2)', fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6, border: 0, cursor: 'pointer' }}>
            All brands <ArrowRight size={11} />
          </button>
        </div>
        <div className="home-grid-4" style={{ display: 'grid', gap: 14 }}>
          {drafts.slice(0, 4).map((b: any) => (
            <div key={b.id}
              onClick={() => {
                // Same distinction as the Brands page: a brand-kit
                // conversation resumes at its own URL, not the legacy wizard.
                if (isBrandKitBrand(b)) {
                  location.assign(CHAT + '?brand=' + b.id);
                  return;
                }
                loadBrand(b.id);
                navigate(b.data && b.data.workflow === 'logo' ? 'logo-brief' : 'step' + (b.step || 1));
              }}
              style={{ borderRadius: 16, overflow: 'hidden', cursor: 'pointer', background: 'var(--bg-elev)', boxShadow: 'inset 0 0 0 1px var(--line)' }}>
              <BA_CardVisual brand={b} height={96} />
              <div style={{ padding: '13px 15px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: '#000', letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{brandDisplayName(b)}</span>
                <span style={{ fontSize: 11.5, color: 'var(--fg-3)', fontFamily: 'var(--font-mono)' }}>
                  {isBrandKitBrand(b) ? 'Brand kit · In progress' : (b.data && b.data.workflow === 'logo' ? 'Logo · Brief' : `Step ${b.step || 1} of 5`)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
      )}

      {/* divider — separates your existing brands from creating a new one */}
      {drafts.length > 0 && <div style={{ height: 1, background: 'var(--line)' }} />}

      {/* ════ START SOMETHING NEW — create a brand ════════════════════ */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="eyebrow" style={{ color: 'var(--fg-3)' }}>Or, start a new brand</div>
      {/* Hero CTA — white card (matches the Brands hero) */}
      <div className="home-hero" style={{
        position: 'relative', background: 'var(--bg-elev)',
        borderRadius: 24, padding: '36px 40px', overflow: 'hidden',
        display: 'flex', alignItems: 'center', gap: 48,
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 1 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 11px', borderRadius: 99, background: 'var(--bg-sunken)', marginBottom: 16 }}>
            <span style={{ width: 13, height: 13, borderRadius: 99, background: 'var(--fl-accent)' }} />
            <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--fg-2)' }}>AI brand agent</span>
          </span>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 40, letterSpacing: '-0.032em', lineHeight: 1.02, margin: '0 0 14px', color: '#000', maxWidth: 480 }}>
            From idea to identity — instantly.
          </h2>
          <p style={{ fontSize: 15.5, color: 'var(--fg-2)', margin: '0 0 24px', maxWidth: 490, lineHeight: 1.5 }}>
            Tell Fluid about your idea. We&apos;ll draft a strategy, name, logo, palette and type — in about 60&nbsp;seconds.
          </p>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => location.assign(CHAT)} style={{ padding: '12px 20px', borderRadius: 12, background: '#000', color: '#fff', fontSize: 14, fontWeight: 700, border: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
              Start a new brand <ArrowRight size={14} />
            </button>
            <button onClick={() => navigate('brands')} style={{ padding: '12px 18px', borderRadius: 12, background: 'transparent', color: 'var(--fg-1)', fontSize: 14, fontWeight: 600, border: 0, cursor: 'pointer', boxShadow: 'inset 0 0 0 1px var(--line-strong)', whiteSpace: 'nowrap' }}>
              Browse templates
            </button>
          </div>
        </div>

        {/* dynamic vertical-scrolling collage of brand work — decorative, hidden below the tablet breakpoint (home-hero) rather than squeezed */}
        <div className="home-hero-collage">
          <BrandCollage />
        </div>
      </div>

      {/* ── Start from a look — quick paths (part of the same section) ── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
          <div className="eyebrow" style={{ color: 'var(--fg-3)' }}>Or, start from a look</div>
          <div style={{ fontSize: 12, color: 'var(--fg-4)' }}>4 visual moods</div>
        </div>
        <div className="home-grid-4" style={{ display: 'grid', gap: 14 }}>
          {QUICK_VISUAL_MODES.map((m) => (
            <QuickPath
              key={m.id}
              route={CHAT + '?mode=' + m.id}
              title={m.title}
              sub={m.sub}
              preview={__assets[m.preview]} previewBg={m.previewBg}
              icon={m.icon}
            />
          ))}
        </div>
      </div>

      </section>


    </div>
  </AShell>
  );
};

