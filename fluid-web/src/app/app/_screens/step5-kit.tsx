"use client";

// Extracted from the original single-file Prototype.tsx as part of #175's
// route split. The code below is unchanged; only the import/export header
// around it is new.

import React from "react";
import { CARD_BUTTON_RESET } from "../_kit/a11y";
import { signalBalanceChanged } from "../_kit/api";
import { FONT_FALLBACK, SvgMark, downloadBlob, ensureGoogleFont, escHtml, kitSlug, pickLogoSvg, svgToPngBlob } from "../_kit/brand";
import { VISUAL_STYLE_OPTIONS } from "../_kit/brand-showcase";
import { AShell } from "../_kit/shell";
import { Sparkle, Thinking } from "../_kit/ui";
import { useBrandDraft } from "../_state/brand-draft-context";
import { useRouter } from "../_state/router-context";

// =====================================================================
// A5 · Step 5 · Brand Kit Screen (Finalized)
// Logo, palette, typography, and guidelines are all AI-generated below.
// =====================================================================

// A single generated color swatch — block + name / hex / usage.
const KitSwatch = ({ c }: any) => (
  <div style={{ flex: '1 1 140px', minWidth: 120, display: 'flex', flexDirection: 'column', gap: 8 }}>
    <div style={{ height: 76, borderRadius: 12, background: c.hex, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.08)' }} />
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13.5, color: '#000', letterSpacing: '-0.01em' }}>{c.name}</div>
        <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--fg-3)', textTransform: 'uppercase' }}>{c.hex}</div>
      </div>
      <div style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 2 }}>{c.role}</div>
      {c.usage && <div style={{ fontSize: 11, color: 'var(--fg-4)', marginTop: 1, lineHeight: 1.35 }}>{c.usage}</div>}
    </div>
  </div>
);

// Full-width palette section for the Brand Kit. Auto-generates on open when a
// brief exists and no palette is cached yet; supports regenerate + retry.
const KitPaletteSection = ({ draft }: any) => {
  const brandId = draft && draft.id;
  const hasBrief = !!(draft && String(draft.brief || '').trim());
  const cached = (draft && draft.data && draft.data.palette) || null;
  const [palette, setPalette] = React.useState(cached);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const requestedFor = React.useRef<any>(null);

  const generate = React.useCallback(async () => {
    if (!brandId) return;
    setLoading(true); setError('');
    const res = await apiGeneratePalette(brandId);
    if (res.error) setError(res.error);
    else setPalette(res.palette);
    setLoading(false);
  }, [brandId]);

  React.useEffect(() => {
    if (!brandId || !hasBrief || palette) return;
    if (requestedFor.current === brandId) return;
    requestedFor.current = brandId;
    generate();
  }, [brandId, hasBrief, palette, generate]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div className="eyebrow" style={{ color: 'var(--fg-3)' }}>Color palette</div>
        <button onClick={() => !loading && generate()} disabled={loading || !brandId} style={{
          padding: '6px 11px', borderRadius: 8, background: 'transparent', color: 'var(--fg-2)',
          fontSize: 11.5, fontWeight: 600, boxShadow: 'inset 0 0 0 1px var(--line)',
          display: 'inline-flex', alignItems: 'center', gap: 6, border: 0,
          cursor: loading ? 'default' : 'pointer', opacity: loading || !brandId ? 0.6 : 1,
        }}>
          <Sparkle size={11} /> {palette ? 'Regenerate' : 'Generate'}
        </button>
      </div>

      <div style={{ background: 'var(--bg-elev)', borderRadius: 18, boxShadow: 'inset 0 0 0 1px var(--line)', padding: 22 }}>
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, fontSize: 12.5, color: '#A8421F' }}>
            <span>{error}</span>
            <button onClick={() => generate()} style={{ padding: '5px 10px', borderRadius: 8, background: '#000', color: '#fff', fontSize: 11.5, fontWeight: 600, border: 0, cursor: 'pointer' }}>Try again</button>
          </div>
        )}

        {!error && !palette && !hasBrief && (
          <div style={{ fontSize: 13, color: 'var(--fg-3)' }}>Add a brief and Fluid will design a palette here.</div>
        )}

        {!error && !palette && hasBrief && (
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ flex: '1 1 140px', minWidth: 120 }}>
                <div style={{ height: 76, borderRadius: 12, background: 'var(--bg-sunken)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{loading && i === 2 ? <Thinking /> : null}</div>
              </div>
            ))}
          </div>
        )}

        {palette && (
          <>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', opacity: loading ? 0.5 : 1 }}>
              {palette.colors.map((c: any, i: any) => <KitSwatch key={c.hex + i} c={c} />)}
            </div>
            {palette.rationale && (
              <p style={{ fontSize: 12.5, color: 'var(--fg-3)', lineHeight: 1.5, margin: '16px 0 0', maxWidth: 640 }}>{palette.rationale}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// Full-width typography section for the Brand Kit. Recommends a Google-Fonts
// heading + body pairing and renders a live specimen. Auto-generates on open.
const KitTypographySection = ({ draft }: any) => {
  const brandId = draft && draft.id;
  const hasBrief = !!(draft && String(draft.brief || '').trim());
  const cached = (draft && draft.data && draft.data.typography) || null;
  const [type, setType] = React.useState(cached);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const requestedFor = React.useRef<any>(null);

  // Load the web fonts whenever we have a pairing to show.
  React.useEffect(() => {
    if (type) { ensureGoogleFont(type.heading.family); ensureGoogleFont(type.body.family); }
  }, [type]);

  const generate = React.useCallback(async () => {
    if (!brandId) return;
    setLoading(true); setError('');
    const res = await apiGenerateTypography(brandId);
    if (res.error) setError(res.error);
    else setType(res.typography);
    setLoading(false);
  }, [brandId]);

  React.useEffect(() => {
    if (!brandId || !hasBrief || type) return;
    if (requestedFor.current === brandId) return;
    requestedFor.current = brandId;
    generate();
  }, [brandId, hasBrief, type, generate]);

  const brandName = (draft && (draft.name_choice || draft.name)) || 'Your brand';
  const ff = (face: any) => '"' + face.family + '", ' + ((FONT_FALLBACK as any)[face.category] || 'sans-serif');

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div className="eyebrow" style={{ color: 'var(--fg-3)' }}>Typography</div>
        <button onClick={() => !loading && generate()} disabled={loading || !brandId} style={{
          padding: '6px 11px', borderRadius: 8, background: 'transparent', color: 'var(--fg-2)',
          fontSize: 11.5, fontWeight: 600, boxShadow: 'inset 0 0 0 1px var(--line)',
          display: 'inline-flex', alignItems: 'center', gap: 6, border: 0,
          cursor: loading ? 'default' : 'pointer', opacity: loading || !brandId ? 0.6 : 1,
        }}>
          <Sparkle size={11} /> {type ? 'Regenerate' : 'Generate'}
        </button>
      </div>

      <div style={{ background: 'var(--bg-elev)', borderRadius: 18, boxShadow: 'inset 0 0 0 1px var(--line)', padding: 22 }}>
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, fontSize: 12.5, color: '#A8421F' }}>
            <span>{error}</span>
            <button onClick={() => generate()} style={{ padding: '5px 10px', borderRadius: 8, background: '#000', color: '#fff', fontSize: 11.5, fontWeight: 600, border: 0, cursor: 'pointer' }}>Try again</button>
          </div>
        )}

        {!error && !type && !hasBrief && (
          <div style={{ fontSize: 13, color: 'var(--fg-3)' }}>Add a brief and Fluid will recommend a type system here.</div>
        )}

        {!error && !type && hasBrief && (
          <div style={{ minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{loading ? <Thinking /> : null}</div>
        )}

        {type && (
          <div style={{ opacity: loading ? 0.5 : 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Heading specimen */}
            <div>
              <div style={{ fontSize: 10.5, fontFamily: 'var(--font-mono)', color: 'var(--fg-3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
                Display · {type.heading.family}{type.heading.weights ? ' · ' + type.heading.weights : ''}
              </div>
              <div style={{ fontFamily: ff(type.heading), fontWeight: 700, fontSize: 40, lineHeight: 1.05, color: '#000', letterSpacing: '-0.02em' }}>{brandName}</div>
              <div style={{ fontFamily: ff(type.heading), fontWeight: 600, fontSize: 20, color: 'var(--fg-1)', marginTop: 6 }}>The quick brown fox jumps over the lazy dog</div>
              {type.heading.usage && <div style={{ fontSize: 11.5, color: 'var(--fg-3)', marginTop: 6 }}>{type.heading.usage}</div>}
            </div>
            {/* Body specimen */}
            <div style={{ borderTop: '1px solid var(--line)', paddingTop: 18 }}>
              <div style={{ fontSize: 10.5, fontFamily: 'var(--font-mono)', color: 'var(--fg-3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
                Body · {type.body.family}{type.body.weights ? ' · ' + type.body.weights : ''}
              </div>
              <p style={{ fontFamily: ff(type.body), fontSize: 15, lineHeight: 1.6, color: 'var(--fg-1)', margin: 0, maxWidth: 620 }}>
                {brandName} helps people move with intention. Every detail is considered, every interaction quiet and deliberate — the kind of product you reach for without thinking. 0123456789
              </p>
              {type.body.usage && <div style={{ fontSize: 11.5, color: 'var(--fg-3)', marginTop: 6 }}>{type.body.usage}</div>}
            </div>
            {type.rationale && (
              <p style={{ fontSize: 12.5, color: 'var(--fg-3)', lineHeight: 1.5, margin: 0, maxWidth: 640 }}>{type.rationale}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Full-width logo section for the Brand Kit. Generates SVG mark concepts and
// lets the user pick one (saved to logo_choice). Auto-generates on open.
const KitLogoSection = ({ draft }: any) => {
  const { setField } = useBrandDraft();
  const brandId = draft && draft.id;
  const hasBrief = !!(draft && String(draft.brief || '').trim());
  const cached = (draft && draft.data && draft.data.logos) || [];
  const chosen = (draft && draft.logo_choice) || null;
  const [logos, setLogos] = React.useState(cached);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const requestedFor = React.useRef<any>(null);

  const generate = React.useCallback(async () => {
    if (!brandId) return;
    setLoading(true); setError('');
    const res = await apiGenerateLogos(brandId);
    if (res.error) setError(res.error);
    else setLogos(res.logos);
    setLoading(false);
  }, [brandId]);

  React.useEffect(() => {
    if (!brandId || !hasBrief || logos.length) return;
    if (requestedFor.current === brandId) return;
    requestedFor.current = brandId;
    generate();
  }, [brandId, hasBrief, logos.length, generate]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div className="eyebrow" style={{ color: 'var(--fg-3)' }}>Logo</div>
        <button onClick={() => !loading && generate()} disabled={loading || !brandId} style={{
          padding: '6px 11px', borderRadius: 8, background: 'transparent', color: 'var(--fg-2)',
          fontSize: 11.5, fontWeight: 600, boxShadow: 'inset 0 0 0 1px var(--line)',
          display: 'inline-flex', alignItems: 'center', gap: 6, border: 0,
          cursor: loading ? 'default' : 'pointer', opacity: loading || !brandId ? 0.6 : 1,
        }}>
          <Sparkle size={11} /> {logos.length ? 'Regenerate' : 'Generate'}
        </button>
      </div>

      {error && (
        <div style={{ marginBottom: 14, padding: '12px 14px', borderRadius: 12, background: 'rgba(253,121,71,.10)', boxShadow: 'inset 0 0 0 1px rgba(253,121,71,.30)', fontSize: 12.5, color: '#A8421F', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span>{error}</span>
          <button onClick={() => generate()} style={{ padding: '5px 10px', borderRadius: 8, background: '#000', color: '#fff', fontSize: 11.5, fontWeight: 600, border: 0, cursor: 'pointer' }}>Try again</button>
        </div>
      )}

      {!error && !logos.length && !hasBrief && (
        <div style={{ background: 'var(--bg-elev)', borderRadius: 18, boxShadow: 'inset 0 0 0 1px var(--line)', padding: 22, fontSize: 13, color: 'var(--fg-3)' }}>Add a brief and Fluid will design logo marks here.</div>
      )}

      {!error && !logos.length && hasBrief && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ background: 'var(--bg-elev)', borderRadius: 16, boxShadow: 'inset 0 0 0 1px var(--line)', minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{loading && i === 1 ? <Thinking /> : null}</div>
          ))}
        </div>
      )}

      {logos.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, opacity: loading ? 0.5 : 1 }}>
          {logos.map((c: any) => {
            const sel = chosen === c.name;
            return (
              <button type="button" key={c.name} onClick={() => setField && setField('logo_choice', c.name)} aria-pressed={sel} style={{
                ...CARD_BUTTON_RESET,
                background: 'var(--bg-elev)', borderRadius: 16, padding: 16, cursor: 'pointer',
                boxShadow: sel ? '0 0 0 2px #000, var(--shadow-sm)' : 'var(--shadow-xs), inset 0 0 0 1px var(--line)',
                display: 'flex', flexDirection: 'column', gap: 12,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 10.5, color: 'var(--fg-3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Concept</span>
                  {sel && <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: '#000', padding: '3px 8px', borderRadius: 99, letterSpacing: '0.04em' }}>SELECTED</span>}
                </div>
                <div style={{ background: '#fff', borderRadius: 12, height: 148, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 0 0 1px var(--line)' }}>
                  <SvgMark svg={c.svg} size={120} />
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: '#000', letterSpacing: '-0.018em' }}>{c.name}</div>
                  {c.descriptor && <div style={{ fontSize: 11.5, color: 'var(--fg-3)', lineHeight: 1.4, marginTop: 2 }}>{c.descriptor}</div>}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// A labelled block within the guidelines document.
const GuideBlock = ({ label, children }: any) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    <div style={{ fontSize: 10.5, fontFamily: 'var(--font-mono)', color: 'var(--fg-3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</div>
    {children}
  </div>
);

// Full-width brand-guidelines section — the capstone. Synthesizes a written
// guide from the brief and the generated assets. Generated on explicit click so
// it reads the palette / type / logo after they've been cached.
const KitGuidelinesSection = ({ draft }: any) => {
  const brandId = draft && draft.id;
  const hasBrief = !!(draft && String(draft.brief || '').trim());
  const cached = (draft && draft.data && draft.data.guidelines) || null;
  const [g, setG] = React.useState(cached);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const generate = React.useCallback(async () => {
    if (!brandId) return;
    setLoading(true); setError('');
    const res = await apiGenerateGuidelines(brandId);
    if (res.error) setError(res.error);
    else setG(res.guidelines);
    setLoading(false);
  }, [brandId]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div className="eyebrow" style={{ color: 'var(--fg-3)' }}>Brand guidelines</div>
        {(g || hasBrief) && (
          <button onClick={() => !loading && generate()} disabled={loading || !brandId} style={{
            padding: '6px 11px', borderRadius: 8, background: g ? 'transparent' : '#000', color: g ? 'var(--fg-2)' : '#fff',
            fontSize: 11.5, fontWeight: 600, boxShadow: g ? 'inset 0 0 0 1px var(--line)' : 'none',
            display: 'inline-flex', alignItems: 'center', gap: 6, border: 0,
            cursor: loading ? 'default' : 'pointer', opacity: loading || !brandId ? 0.6 : 1,
          }}>
            <Sparkle size={11} color={g ? undefined : '#fff'} /> {loading ? 'Writing…' : g ? 'Regenerate' : 'Generate guide'}
          </button>
        )}
      </div>

      <div style={{ background: 'var(--bg-elev)', borderRadius: 18, boxShadow: 'inset 0 0 0 1px var(--line)', padding: 24 }}>
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, fontSize: 12.5, color: '#A8421F', marginBottom: g ? 16 : 0 }}>
            <span>{error}</span>
            <button onClick={() => generate()} style={{ padding: '5px 10px', borderRadius: 8, background: '#000', color: '#fff', fontSize: 11.5, fontWeight: 600, border: 0, cursor: 'pointer' }}>Try again</button>
          </div>
        )}

        {!g && !error && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
            {loading ? <Thinking /> : (
              <div style={{ fontSize: 13, color: 'var(--fg-3)', lineHeight: 1.5 }}>
                {hasBrief
                  ? 'Assemble a written brand guide — positioning, voice, messaging, and usage — from your brief and the assets above.'
                  : 'Add a brief and Fluid will write your brand guide here.'}
              </div>
            )}
          </div>
        )}

        {g && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, opacity: loading ? 0.5 : 1 }}>
            {g.positioning && (
              <GuideBlock label="Positioning">
                <p style={{ fontSize: 15, lineHeight: 1.6, color: '#000', margin: 0, maxWidth: 660 }}>{g.positioning}</p>
              </GuideBlock>
            )}

            {g.messaging && g.messaging.tagline && (
              <GuideBlock label="Tagline">
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: '#000', letterSpacing: '-0.02em' }}>{g.messaging.tagline}</div>
              </GuideBlock>
            )}

            {g.voice && (g.voice.traits.length > 0 || g.voice.description) && (
              <GuideBlock label="Voice & tone">
                {g.voice.traits.length > 0 && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                    {g.voice.traits.map((t: any) => (
                      <span key={t} style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-1)', padding: '4px 10px', borderRadius: 99, boxShadow: 'inset 0 0 0 1px var(--line)' }}>{t}</span>
                    ))}
                  </div>
                )}
                {g.voice.description && <p style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--fg-1)', margin: 0, maxWidth: 660 }}>{g.voice.description}</p>}
              </GuideBlock>
            )}

            {g.messaging && g.messaging.pillars && g.messaging.pillars.length > 0 && (
              <GuideBlock label="Key messages">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  {g.messaging.pillars.map((p: any, i: any) => (
                    <div key={i} style={{ background: 'var(--bg)', borderRadius: 12, padding: 14, boxShadow: 'inset 0 0 0 1px var(--line)' }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13.5, color: '#000', marginBottom: 4 }}>{p.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--fg-2)', lineHeight: 1.45 }}>{p.body}</div>
                    </div>
                  ))}
                </div>
              </GuideBlock>
            )}

            {(g.dos.length > 0 || g.donts.length > 0) && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                <GuideBlock label="Do">
                  <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {g.dos.map((d: any, i: any) => (
                      <li key={i} style={{ fontSize: 13, color: 'var(--fg-1)', lineHeight: 1.45, display: 'flex', gap: 8 }}>
                        <span style={{ color: '#0E6B5E', fontWeight: 700 }}>✓</span> {d}
                      </li>
                    ))}
                  </ul>
                </GuideBlock>
                <GuideBlock label="Don't">
                  <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {g.donts.map((d: any, i: any) => (
                      <li key={i} style={{ fontSize: 13, color: 'var(--fg-1)', lineHeight: 1.45, display: 'flex', gap: 8 }}>
                        <span style={{ color: '#A8421F', fontWeight: 700 }}>✕</span> {d}
                      </li>
                    ))}
                  </ul>
                </GuideBlock>
              </div>
            )}

            {g.usage && (g.usage.logo || g.usage.color || g.usage.type) && (
              <GuideBlock label="Asset usage">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {g.usage.logo && <div style={{ fontSize: 13, color: 'var(--fg-1)', lineHeight: 1.5 }}><b style={{ color: '#000' }}>Logo — </b>{g.usage.logo}</div>}
                  {g.usage.color && <div style={{ fontSize: 13, color: 'var(--fg-1)', lineHeight: 1.5 }}><b style={{ color: '#000' }}>Color — </b>{g.usage.color}</div>}
                  {g.usage.type && <div style={{ fontSize: 13, color: 'var(--fg-1)', lineHeight: 1.5 }}><b style={{ color: '#000' }}>Type — </b>{g.usage.type}</div>}
                </div>
              </GuideBlock>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

function buildPaletteCss(b: any) {
  const colors = ((b.data && b.data.palette && b.data.palette.colors) || []);
  let css = '/* ' + (b.name_choice || b.name || 'Brand') + ' — color palette */\n:root {\n';
  colors.forEach((c: any, i: any) => {
    const key = kitSlug(c.name) || ('color-' + (i + 1));
    css += '  --brand-' + key + ': ' + c.hex + ';' + (c.role ? '  /* ' + c.role + ' */' : '') + '\n';
  });
  css += '}\n';
  return css;
}

function googleFontsHref(families: any) {
  const uniq = Array.from(new Set(families.filter(Boolean)));
  if (!uniq.length) return '';
  return 'https://fonts.googleapis.com/css2?' +
    uniq.map((f: any) => 'family=' + encodeURIComponent(f).replace(/%20/g, '+')).join('&') + '&display=swap';
}

// Compose a single self-contained HTML brand sheet from everything generated.
function buildBrandSheetHtml(b: any) {
  const data = b.data || {};
  const name = b.name_choice || b.name || 'Your brand';
  const pal = data.palette || {};
  const colors = pal.colors || [];
  const type = data.typography || null;
  const g = data.guidelines || null;
  const logoSvg = pickLogoSvg(b);
  const headFam = type && type.heading && type.heading.family;
  const bodyFam = type && type.body && type.body.family;
  const fontsHref = googleFontsHref([headFam, bodyFam]);
  const ff = (fam: any, fallback: any) => fam ? ('"' + fam + '", ' + fallback) : fallback;

  const sec = (title: any, inner: any) => inner
    ? '<section><h2>' + escHtml(title) + '</h2>' + inner + '</section>' : '';

  const briefRows = [
    ['Brief', b.brief], ['Audience', b.audience], ['Logo direction', b.logo_choice],
  ].filter((r) => r[1]).map((r) => '<div class="row"><span>' + escHtml(r[0]) + '</span><p>' + escHtml(r[1]) + '</p></div>').join('');

  const paletteHtml = colors.length ? '<div class="swatches">' + colors.map((c: any) =>
    '<div class="sw"><div class="chip" style="background:' + escHtml(c.hex) + '"></div>' +
    '<b>' + escHtml(c.name) + '</b><code>' + escHtml((c.hex || '').toUpperCase()) + '</code>' +
    '<em>' + escHtml(c.role) + '</em>' + (c.usage ? '<span>' + escHtml(c.usage) + '</span>' : '') + '</div>').join('') +
    '</div>' + (pal.rationale ? '<p class="note">' + escHtml(pal.rationale) + '</p>' : '') : '';

  const typeHtml = type ? (
    '<div class="type"><div class="eyebrow">Display · ' + escHtml(headFam) + (type.heading.weights ? ' · ' + escHtml(type.heading.weights) : '') + '</div>' +
    '<div class="display" style="font-family:' + ff(headFam, 'serif') + '">' + escHtml(name) + '</div>' +
    '<div class="eyebrow">Body · ' + escHtml(bodyFam) + (type.body.weights ? ' · ' + escHtml(type.body.weights) : '') + '</div>' +
    '<p class="body" style="font-family:' + ff(bodyFam, 'sans-serif') + '">The quick brown fox jumps over the lazy dog. 0123456789</p>' +
    (type.rationale ? '<p class="note">' + escHtml(type.rationale) + '</p>' : '') + '</div>'
  ) : '';

  const guidelinesHtml = g ? (
    (g.positioning ? '<h3>Positioning</h3><p>' + escHtml(g.positioning) + '</p>' : '') +
    (g.messaging && g.messaging.tagline ? '<h3>Tagline</h3><p class="tag">' + escHtml(g.messaging.tagline) + '</p>' : '') +
    (g.voice && (g.voice.traits || []).length ? '<h3>Voice &amp; tone</h3><p>' + (g.voice.traits || []).map(escHtml).join(' · ') + '</p>' + (g.voice.description ? '<p>' + escHtml(g.voice.description) + '</p>' : '') : '') +
    (g.messaging && (g.messaging.pillars || []).length ? '<h3>Key messages</h3><ul>' + g.messaging.pillars.map((p: any) => '<li><b>' + escHtml(p.title) + '</b> — ' + escHtml(p.body) + '</li>').join('') + '</ul>' : '') +
    ((g.dos || []).length ? '<h3>Do</h3><ul>' + g.dos.map((d: any) => '<li>' + escHtml(d) + '</li>').join('') + '</ul>' : '') +
    ((g.donts || []).length ? '<h3>Don’t</h3><ul>' + g.donts.map((d: any) => '<li>' + escHtml(d) + '</li>').join('') + '</ul>' : '') +
    (g.usage ? '<h3>Asset usage</h3>' + ['logo', 'color', 'type'].filter((k) => g.usage[k]).map((k) => '<p><b>' + k[0].toUpperCase() + k.slice(1) + '</b> — ' + escHtml(g.usage[k]) + '</p>').join('') : '')
  ) : '';

  return '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>' + escHtml(name) + ' — Brand kit</title>' +
    (fontsHref ? '<link rel="stylesheet" href="' + escHtml(fontsHref) + '">' : '') +
    '<style>' +
    ':root{color-scheme:light}*{box-sizing:border-box}body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#141414;background:#fff;line-height:1.5}' +
    '.wrap{max-width:820px;margin:0 auto;padding:64px 32px}' +
    'header{border-bottom:1px solid #eee;padding-bottom:28px;margin-bottom:40px}' +
    'h1{font-size:44px;letter-spacing:-.03em;margin:0}.sub{color:#888;font-size:13px;text-transform:uppercase;letter-spacing:.12em;margin-bottom:14px}' +
    'section{margin:40px 0}h2{font-size:12px;text-transform:uppercase;letter-spacing:.1em;color:#999;margin:0 0 16px}' +
    'h3{font-size:14px;margin:22px 0 6px}p{margin:0 0 10px}.note{color:#777;font-size:13px}' +
    '.row{display:flex;gap:16px;margin:8px 0}.row span{flex:0 0 130px;color:#999;font-size:13px}.row p{margin:0}' +
    '.logo{border:1px solid #eee;border-radius:16px;padding:40px;display:flex;justify-content:center;background:#fff}' +
    '.swatches{display:flex;flex-wrap:wrap;gap:16px}.sw{width:130px}.sw .chip{height:72px;border-radius:10px;box-shadow:inset 0 0 0 1px rgba(0,0,0,.08)}' +
    '.sw b{display:block;font-size:13px;margin-top:8px}.sw code{display:block;font-size:11px;color:#888}.sw em{display:block;font-size:11px;color:#aaa;font-style:normal}.sw span{display:block;font-size:11px;color:#aaa}' +
    '.display{font-size:52px;letter-spacing:-.02em;margin:6px 0 20px}.body{font-size:16px}.eyebrow{font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#aaa;margin-top:14px}' +
    '.tag{font-size:22px;font-weight:700}ul{margin:6px 0;padding-left:20px}li{margin:4px 0}' +
    '@media print{.wrap{padding:24px}}' +
    '</style></head><body><div class="wrap">' +
    '<header><div class="sub">Brand kit</div><h1>' + escHtml(name) + '</h1></header>' +
    (briefRows ? '<section><h2>Overview</h2>' + briefRows + '</section>' : '') +
    (logoSvg ? sec('Logo', '<div class="logo">' + logoSvg + '</div>') : '') +
    sec('Color', paletteHtml) +
    sec('Typography', typeHtml) +
    sec('Guidelines', guidelinesHtml) +
    '<section class="note">Generated with Fluid.</section>' +
    '</div></body></html>';
}

const KitExport = ({ b }: any) => {
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const menuRef = React.useRef<HTMLDivElement | null>(null);

  // #171: the menu used to be dismissable only by clicking a transparent
  // backdrop div — no way out, and no way in, from the keyboard. Escape now
  // closes it and returns focus to the trigger, and opening it moves focus to
  // the first item so the menu is reachable at all without a pointer.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener('keydown', onKey);
    menuRef.current?.querySelector<HTMLButtonElement>('button:not([disabled])')?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);
  const data = b.data || {};
  const hasLogo = !!pickLogoSvg(b);
  const hasPalette = !!(data.palette && (data.palette.colors || []).length);
  const slug = kitSlug(b.name_choice || b.name || 'brand');

  const dlSheet = () => { downloadBlob(slug + '-brand-kit.html', new Blob([buildBrandSheetHtml(b)], { type: 'text/html' })); setOpen(false); };
  const dlSvg = () => { const s = pickLogoSvg(b); if (s) downloadBlob(slug + '-logo.svg', new Blob([s], { type: 'image/svg+xml' })); setOpen(false); };
  const dlPng = async () => {
    const s = pickLogoSvg(b); if (!s) return;
    setBusy(true);
    try { downloadBlob(slug + '-logo.png', await svgToPngBlob(s, 512)); } catch { /* ignore */ }
    setBusy(false); setOpen(false);
  };
  const dlCss = () => { downloadBlob(slug + '-palette.css', new Blob([buildPaletteCss(b)], { type: 'text/css' })); setOpen(false); };

  const item = (label: any, onClick: any, enabled: any) => (
    <button role="menuitem" onClick={enabled ? onClick : undefined} disabled={!enabled} style={{
      display: 'block', width: '100%', textAlign: 'left', padding: '9px 14px',
      background: 'transparent', border: 0, cursor: enabled ? 'pointer' : 'default',
      fontSize: 13, fontWeight: 500, color: enabled ? 'var(--fg-1)' : 'var(--fg-4)', fontFamily: 'inherit',
    }}>{label}</button>
  );

  return (
    <div style={{ position: 'relative', flex: '0 0 auto' }}>
      <button ref={triggerRef} onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu" aria-expanded={open} aria-busy={busy} style={{
        padding: '11px 16px', borderRadius: 12, background: '#000', color: '#fff',
        fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 0,
        display: 'inline-flex', alignItems: 'center', gap: 8,
      }}>
        {busy ? 'Exporting…' : 'Export'}
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? 'rotate(180deg)' : 'none' }}><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      {open && (
        <>
          {/* Click-away catcher. Presentational: Escape is the keyboard route
              out, handled above, so this must not appear to assistive tech. */}
          <div onClick={() => setOpen(false)} aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
          <div ref={menuRef} role="menu" aria-label="Export brand kit" style={{
            position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 41, minWidth: 210,
            background: 'var(--bg-elev)', borderRadius: 12, padding: 6,
            boxShadow: '0 12px 30px rgba(0,0,0,.16), inset 0 0 0 1px var(--line)',
          }}>
            {item('Brand sheet (.html)', dlSheet, true)}
            {item('Logo (SVG)', dlSvg, hasLogo)}
            {item('Logo (PNG)', dlPng, hasLogo)}
            {item('Palette (.css)', dlCss, hasPalette)}
            <div style={{ padding: '6px 14px 2px', fontSize: 10.5, color: 'var(--fg-4)', lineHeight: 1.4 }}>
              The brand sheet gathers everything — open it and print to PDF.
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export const DirA_KitSummary = () => {
  const { draft } = useBrandDraft();
  const { navigate } = useRouter();
  const b = draft || {};
  const styleName = (VISUAL_STYLE_OPTIONS.find((o) => o.id === b.style_id) || {}).name || (b.style_id || '—');
  const rows = [
    { k: 'Name', v: b.name_choice || b.name || '—' },
    { k: 'Brief', v: b.brief || '—' },
    { k: 'Audience', v: b.audience || '—' },
    { k: 'Style', v: styleName },
    { k: 'Logo direction', v: b.logo_choice || '—' },
  ];
  return (
    <AShell activeNav="brands" breadcrumb={['Brands', b.name || 'Brand kit']}>
      <div style={{ height: '100%', overflowY: 'auto' }}>
        <div className="main-pad is-narrow" style={{ padding: '44px 56px 64px', display: 'flex', flexDirection: 'column', gap: 30 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24 }}>
            <div>
              <div className="eyebrow" style={{ color: 'var(--fg-3)', marginBottom: 12 }}>Brand kit · {b.status === 'live' ? 'Live' : 'Draft'}</div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 48, letterSpacing: '-0.04em', lineHeight: 1, margin: 0, color: '#000' }}>{b.name || 'Your brand'}</h1>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '0 0 auto' }}>
              <button onClick={() => navigate('step4')} style={{ padding: '11px 16px', borderRadius: 12, background: 'var(--bg-elev)', color: 'var(--fg-1)', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: 'inset 0 0 0 1px var(--line)' }}>Iterate</button>
              <KitExport b={b} />
            </div>
          </div>

          <div style={{ background: 'var(--bg-elev)', borderRadius: 18, boxShadow: 'inset 0 0 0 1px var(--line)', padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="eyebrow" style={{ color: 'var(--fg-3)' }}>Your brief</div>
            {rows.map((r) => (
              <div key={r.k} style={{ display: 'flex', gap: 16, alignItems: 'baseline' }}>
                <div style={{ width: 130, flex: '0 0 130px', fontSize: 12.5, color: 'var(--fg-3)', fontWeight: 600 }}>{r.k}</div>
                <div style={{ flex: 1, fontSize: 14.5, color: '#000', lineHeight: 1.5 }}>{r.v}</div>
              </div>
            ))}
          </div>

          <KitLogoSection draft={draft} />

          <KitPaletteSection draft={draft} />

          <KitTypographySection draft={draft} />

          <KitGuidelinesSection draft={draft} />
        </div>
      </div>
    </AShell>
  );
};

// Phase 3 — ask OpenAI for a color palette for this brand.
async function apiGeneratePalette(brandId: any) {
  try {
    const r = await fetch('/api/generate/palette', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brandId }),
    });
    const j = await r.json().catch(() => ({}));
    signalBalanceChanged(j.code);
    if (!r.ok) return { error: j.error || 'Generation failed.', code: j.code };
    return { palette: j.palette || null };
  } catch { return { error: 'Network error.' }; }
}

// Phase 3 — ask OpenAI for a typography pairing for this brand.
async function apiGenerateTypography(brandId: any) {
  try {
    const r = await fetch('/api/generate/typography', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brandId }),
    });
    const j = await r.json().catch(() => ({}));
    signalBalanceChanged(j.code);
    if (!r.ok) return { error: j.error || 'Generation failed.', code: j.code };
    return { typography: j.typography || null };
  } catch { return { error: 'Network error.' }; }
}

// Phase 3 — ask OpenAI for SVG logo concepts for this brand.
async function apiGenerateLogos(brandId: any) {
  try {
    const r = await fetch('/api/generate/logo', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brandId }),
    });
    const j = await r.json().catch(() => ({}));
    signalBalanceChanged(j.code);
    if (!r.ok) return { error: j.error || 'Generation failed.', code: j.code };
    return { logos: j.logos || [] };
  } catch { return { error: 'Network error.' }; }
}

// Phase 3 — ask OpenAI to synthesize written brand guidelines.
async function apiGenerateGuidelines(brandId: any) {
  try {
    const r = await fetch('/api/generate/guidelines', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brandId }),
    });
    const j = await r.json().catch(() => ({}));
    signalBalanceChanged(j.code);
    if (!r.ok) return { error: j.error || 'Generation failed.', code: j.code };
    return { guidelines: j.guidelines || null };
  } catch { return { error: 'Network error.' }; }
}

