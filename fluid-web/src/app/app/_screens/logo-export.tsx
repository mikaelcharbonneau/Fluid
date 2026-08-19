"use client";

// Extracted from the original single-file Prototype.tsx as part of #175's
// route split. The code below is unchanged; only the import/export header
// around it is new.

import React from "react";
import { EXPORT_FORMATS, ICO_SIZES, PNG_SIZES, USE_CASES, reasonsFor, recommendedFormats } from "@/lib/logo-export";
import { markPaths, monochromeSvg, parseLogoSvg, reversedSvg, transparentSvg } from "@/lib/logo-svg";
import { svgToPdfBytes } from "@/lib/export-pdf";
import { buildIco } from "@/lib/export-ico";
import { buildZip } from "@/lib/export-zip";
import { downloadBlob, kitSlug, pickLogoSvg, svgToPngBlob } from "../_kit/brand";
import { LogoFlowContext, LogoStepShell, useLogoFlowNav } from "../_kit/logo-flow";
import { useBrandDraft } from "../_state/brand-draft-context";

// Standalone logo studio · Step 7 · Export. The client says what the mark is
// for; the formats follow from that.
//
// No model is consulted. Which file a browser tab wants is knowledge, not
// judgement — it lives in a table in logo-export.ts where it can be read and
// corrected. The uses only pre-tick the formats; every one stays editable, so a
// client who knows they need a PDF can have one whatever they ticked above.
export const DirA_LogoExport = () => {
  const { draft, setData } = useBrandDraft();
  const navigate = useLogoFlowNav();
  const embedded = !!React.useContext(LogoFlowContext);
  const data = (draft && draft.data) || {};

  const svg = pickLogoSvg(draft || {});
  const slug = kitSlug((draft && (draft.name_choice || draft.name)) || 'brand');

  const [uses, setUses] = React.useState(
    Array.isArray(data.logo_export_uses) ? data.logo_export_uses : [],
  );
  // Formats the client has overridden by hand. Until they touch one, the list
  // simply tracks the uses — tick "Browser tab" and the favicon appears.
  const [overrides, setOverrides] = React.useState(
    (data.logo_export_formats && typeof data.logo_export_formats === 'object')
      ? data.logo_export_formats
      : {},
  );
  const [busy, setBusy] = React.useState('');
  const [error, setError] = React.useState('');
  const [note, setNote] = React.useState('');

  const suggested = React.useMemo(() => recommendedFormats(uses), [uses]);
  const isOn = (id: any) => (id in overrides ? !!overrides[id] : suggested.includes(id));
  const selected = EXPORT_FORMATS.filter((f) => isOn(f.id)).map((f) => f.id);

  const persist = (nextUses: any, nextOverrides: any) => {
    setData({
      logo_export_uses: nextUses,
      logo_export_formats: nextOverrides,
    });
  };

  const toggleUse = (id: any) => {
    const next = uses.includes(id) ? uses.filter((u: any) => u !== id) : [...uses, id];
    setUses(next);
    persist(next, overrides);
    setNote('');
  };

  const toggleFormat = (id: any) => {
    const next = { ...overrides, [id]: !isOn(id) };
    setOverrides(next);
    persist(uses, next);
  };

  // Rasterise through the same canvas path the kit already uses, but from the
  // transparent artwork: the tracer lays a white plate under every mark, and a
  // favicon on an opaque white square is the classic giveaway of a logo that
  // was exported carelessly.
  const pngBytesAt = async (source: any, size: any) => {
    const blob = await svgToPngBlob(source, size);
    return new Uint8Array(await blob.arrayBuffer());
  };

  const download = async () => {
    if (!svg || busy) return;
    setBusy('Preparing files…'); setError(''); setNote('');
    try {
      const enc = new TextEncoder();
      const files = [];
      const skipped = [];

      const clean = transparentSvg(svg) || svg;
      const parsed = parseLogoSvg(svg);

      if (isOn('svg')) {
        files.push({ name: `${slug}/${slug}.svg`, bytes: enc.encode(clean) });
      }

      if (isOn('png')) {
        setBusy('Rendering PNGs…');
        for (const size of PNG_SIZES) {
          files.push({
            name: `${slug}/png/${slug}-${size}.png`,
            bytes: await pngBytesAt(clean, size),
          });
        }
      }

      if (isOn('ico')) {
        setBusy('Building the favicon…');
        const images = [];
        for (const size of ICO_SIZES) {
          images.push({ size, png: await pngBytesAt(clean, size) });
        }
        files.push({ name: `${slug}/favicon.ico`, bytes: buildIco(images) });
      }

      if (isOn('pdf')) {
        setBusy('Writing the PDF…');
        try {
          // Mark only: a white box behind the logo stops a printer overprinting
          // it on anything other than white stock.
          const marks = parsed ? markPaths(parsed) : null;
          files.push({
            name: `${slug}/${slug}.pdf`,
            bytes: svgToPdfBytes(svg, marks && marks.length ? marks : undefined),
          });
        } catch (e: any) {
          // One unconvertible artwork must not cost the client the other files.
          skipped.push(e && e.message ? e.message : 'The PDF could not be written.');
        }
      }

      if (isOn('mono')) {
        const mono = monochromeSvg(svg, '#000000');
        if (mono) {
          files.push({ name: `${slug}/single-colour/${slug}-black.svg`, bytes: enc.encode(mono) });
          files.push({ name: `${slug}/single-colour/${slug}-black-512.png`, bytes: await pngBytesAt(mono, 512) });
        }
      }

      if (isOn('reversed')) {
        const rev = reversedSvg(svg);
        if (rev) {
          files.push({ name: `${slug}/reversed/${slug}-reversed.svg`, bytes: enc.encode(rev) });
          files.push({ name: `${slug}/reversed/${slug}-reversed-512.png`, bytes: await pngBytesAt(rev, 512) });
        }
      }

      if (!files.length) {
        setError('Tick at least one format to export.');
        setBusy('');
        return;
      }

      setBusy('Zipping…');
      const zip = buildZip(files);
      downloadBlob(`${slug}-logo-files.zip`, new Blob([zip as any], { type: 'application/zip' }));
      setNote(
        `${files.length} file${files.length === 1 ? '' : 's'} downloaded.` +
        (skipped.length ? ` ${skipped.join(' ')}` : ''),
      );
    } catch (e: any) {
      setError((e && e.message) || 'Something went wrong building the files.');
    }
    setBusy('');
  };

  const cardStyle = (on: any): React.CSSProperties => ({
    textAlign:'left',padding:'12px 13px',borderRadius:12,cursor:'pointer',border:0,
    background:'var(--bg-elev)',fontFamily:'inherit',
    boxShadow: on ? '0 0 0 2px #000' : 'inset 0 0 0 1px var(--line)',
    display:'flex',flexDirection:'column',gap:4,
  });

  return (
    <LogoStepShell
      step={7}
      title="Export the mark."
      subtitle="Say what it's for and the right files are picked for you. Change anything you like."
      dockCopy={!svg
        ? 'Choose a mark first — there is no artwork to export yet.'
        : selected.length
          ? `${selected.length} format${selected.length === 1 ? '' : 's'} selected.`
          : 'Pick what the logo is for, or tick formats yourself.'}
      nextLabel={embedded ? 'Continue to Style' : 'Assemble Brand Kit'}
      onBack={() => navigate('logo-refine')}
      onNext={() => navigate(embedded ? 'step4' : 'step5')}
    >
      <section aria-labelledby="logo-export-heading" style={{display:'flex',flexDirection:'column',gap:18}}>
        <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:16,flexWrap:'wrap'}}>
          <div>
            <div className="eyebrow" style={{color:'var(--fg-3)'}}>
              Export{selected.length ? ` · ${selected.length} selected` : ''}
            </div>
            <h3 id="logo-export-heading" style={{
              margin:'6px 0 0',fontFamily:'var(--font-display)',fontSize:20,fontWeight:700,
              color:'#000',letterSpacing:'-0.015em',
            }}>The right files for the job.</h3>
          </div>
          <button type="button" onClick={download} disabled={!svg || !!busy || !selected.length}
            style={{
              padding:'9px 13px',borderRadius:9,fontSize:12,fontWeight:600,border:0,
              display:'inline-flex',alignItems:'center',gap:7,background:'#0E0F12',color:'#fff',
              cursor:(!svg || busy || !selected.length) ? 'default' : 'pointer',
              opacity:(!svg || busy || !selected.length) ? .5 : 1,
            }}>
            {busy || 'Download files'}
          </button>
        </div>

        {!svg && (
          <div role="status" style={{
            padding:'14px 16px',borderRadius:12,background:'var(--bg-elev)',
            boxShadow:'inset 0 0 0 1px var(--line)',fontSize:12.5,color:'var(--fg-2)',
            display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap',
          }}>
            <span>Export needs a traced mark. Pick one on the refinement step and the studio will vector it.</span>
            <button type="button" onClick={() => navigate('logo-refine')} style={{
              padding:'5px 10px',borderRadius:8,background:'#000',color:'#fff',
              fontSize:11.5,fontWeight:600,border:0,cursor:'pointer',
            }}>Back to refinement</button>
          </div>
        )}

        {error && (
          <div role="alert" style={{
            padding:'12px 14px',borderRadius:12,background:'rgba(253,121,71,.10)',
            boxShadow:'inset 0 0 0 1px rgba(253,121,71,.30)',fontSize:12.5,color:'#A8421F',
          }}>{error}</div>
        )}

        {note && (
          <div role="status" style={{
            padding:'12px 14px',borderRadius:12,background:'var(--bg-elev)',
            boxShadow:'inset 0 0 0 1px var(--line)',fontSize:12.5,color:'var(--fg-2)',
          }}>{note}</div>
        )}

        <div>
          <div className="eyebrow" style={{color:'var(--fg-3)',marginBottom:8}}>
            1 · What is the logo for
          </div>
          <div className="home-grid-3" style={{display:'grid',gap:10}}>
            {USE_CASES.map((u) => {
              const on = uses.includes(u.id);
              return (
                <button key={u.id} type="button" onClick={() => toggleUse(u.id)}
                  aria-pressed={on} style={cardStyle(on)}>
                  <span style={{
                    fontFamily:'var(--font-display)',fontWeight:700,fontSize:13,
                    letterSpacing:'-0.015em',color:'#000',
                  }}>{u.label}</span>
                  <span style={{fontSize:11,color:'var(--fg-3)',lineHeight:1.4}}>{u.blurb}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="eyebrow" style={{color:'var(--fg-3)',marginBottom:8}}>
            2 · Files{uses.length ? ' — picked for those uses' : ''}
          </div>
          <div style={{
            padding:'12px 14px',borderRadius:12,background:'var(--bg-elev)',
            boxShadow:'inset 0 0 0 1px var(--line)',fontSize:11,color:'var(--fg-3)',
            lineHeight:1.5,marginBottom:12,
          }}>
            {uses.length
              ? 'Ticked from what you chose above. Change any of them — your choice wins from then on.'
              : 'Choose a use above and the files tick themselves, or just pick what you want here.'}
            {' '}Everything arrives as one zip, with the mark on transparency rather than the white plate the tracer leaves behind.
          </div>
          <div className="home-grid-3" style={{display:'grid',gap:10}}>
            {EXPORT_FORMATS.map((f) => {
              const on = isOn(f.id);
              const why = reasonsFor(f.id, uses);
              return (
                <button key={f.id} type="button" onClick={() => toggleFormat(f.id)}
                  aria-pressed={on} style={cardStyle(on)}>
                  <span style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}>
                    <span style={{
                      fontFamily:'var(--font-display)',fontWeight:700,fontSize:13,
                      letterSpacing:'-0.015em',color:'#000',
                    }}>{f.label}</span>
                    {on && <span style={{
                      fontSize:9.5,fontWeight:700,color:'#fff',background:'#000',
                      padding:'2px 7px',borderRadius:99,letterSpacing:'0.04em',
                    }}>ON</span>}
                  </span>
                  <span style={{fontSize:11,color:'var(--fg-3)',lineHeight:1.4}}>{f.hint}</span>
                  {why.length > 0 && (
                    <span style={{fontSize:10,color:'var(--fg-4)',lineHeight:1.4}}>
                      For {why.join(', ').toLowerCase()}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </LogoStepShell>
  );
};

