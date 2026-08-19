"use client";

// Extracted from the original single-file Prototype.tsx as part of #175's
// route split. The code below is unchanged; only the import/export header
// around it is new.

import React from "react";
import { CARD_BUTTON_RESET } from "../_kit/a11y";
import { BA_CardVisual, brandDisplayName, isBrandKitBrand } from "../_kit/brand";
import { AShell, CHAT } from "../_kit/shell";
import { AEmptyState, PlusIcon, Sparkle, Thinking } from "../_kit/ui";
import { useBrandDraft } from "../_state/brand-draft-context";
import { useRouter } from "../_state/router-context";

// =====================================================================
// Brand definitions — surfaces, type, palette, marks
// =====================================================================

// ------------------------------------------------------------------
// 05-brands
// ------------------------------------------------------------------
// =====================================================================
// Direction A · Brands — populated (showcase) state
//
// What the Brands library looks like once the user actually has brands.
// Instead of the empty-state create flow, the four brands take the stage:
// each shown as a full identity sheet (reusing the brand hero sheets from
// dir-a-canvas.jsx) with a metadata footer — sector, asset count, last
// edited, status, and quick actions. A slim "new brand" strip keeps the
// create path available without stealing the spotlight.
//
// Reuses AShell (activeNav="brands"). Heroes/logos/fonts come from window.
// =====================================================================

const { useState: useBAState } = React;

// ---- Brand records ----------------------------------------------------
const BA_IcoArrow = ({ s = 13 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
);

const BA_IcoChevDown = ({ s = 13 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
);

const BA_StatusPill = ({ status }: any) => {
  const map = {
    live:  { dot: '#44D9C7', label: 'Live',  fg: '#0E6B5E', bg: 'rgba(68,217,199,.20)' },
    draft: { dot: 'var(--fg-4)', label: 'Draft', fg: 'var(--fg-3)', bg: 'var(--bg-sunken)' },
  };
  const s = (map as any)[status] || map.draft;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 10px', borderRadius: 999, background: s.bg, color: s.fg,
      fontSize: 11, fontWeight: 600, letterSpacing: '0.01em',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 99, background: s.dot }} />
      {s.label}
    </span>
  );
};

const BA_EmptyState = ({ onCreate }: any) => (
  <AEmptyState
    title="No brands yet"
    body="Start your first brand and it'll live here — every name, logo, palette and guideline you build with Fluid."
    ctaLabel="Create your first brand"
    onCta={onCreate}
  />
);

// Relative "time ago" for real saved-brand timestamps.
function relTime(iso: any) {
  if (!iso) return '';
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'Just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  if (s < 172800) return 'Yesterday';
  return Math.floor(s / 86400) + 'd ago';
}

// Card for a real, user-saved brand. The top visual reflects the brand's own
// generated identity (logo / palette) rather than a generic tile.
// The card carries its own Delete button, so the card itself cannot be one
// (nested interactive elements are invalid and unreachable by keyboard).
// The open action is a real button covering the card's body instead, with
// Delete as its sibling — #171.
const BA_RealBrandCard = ({ brand, onOpen, onDelete }: any) => (
  <div
    style={{
      borderRadius: 16, overflow: 'hidden', background: 'var(--bg-elev)',
      boxShadow: 'inset 0 0 0 1px var(--line)', display: 'flex', flexDirection: 'column',
      position: 'relative',
    }}
  >
    {/* zIndex is load-bearing: BA_CardVisual below is position:relative and
        comes later in the DOM, so with both at z-index auto it painted on top
        of this button and swallowed every click — the delete button looked
        dead because the click was landing on the card and opening the brand
        instead. Any positioned sibling added after this one needs the same
        consideration. */}
    <button
      onClick={onDelete}
      aria-label={'Delete ' + brandDisplayName(brand)}
      title="Delete brand"
      style={{
        position: 'absolute', zIndex: 2, top: 10, right: 10, width: 28, height: 28, borderRadius: 8,
        background: 'rgba(0,0,0,.35)', color: '#fff', border: 0, cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)',
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
    </button>
    <button type="button" onClick={onOpen}
      style={{ ...CARD_BUTTON_RESET, cursor: 'pointer', display: 'flex', flexDirection: 'column' }}>
      <BA_CardVisual brand={brand} />
      <span style={{ display: 'flex', width: '100%', padding: '14px 16px', flexDirection: 'column', gap: 10 }}>
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, color: '#000', letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {brandDisplayName(brand)}
          </span>
          <BA_StatusPill status={brand.status} />
        </span>
        <span style={{ display: 'block', fontSize: 13, color: 'var(--fg-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {brand.brief ? brand.brief : 'No description yet'}
        </span>
        <span style={{ display: 'block', fontSize: 11.5, color: 'var(--fg-4)', fontFamily: 'var(--font-mono)' }}>
          Edited {relTime(brand.updated_at)}
        </span>
      </span>
    </button>
  </div>
);

// =====================================================================
// The screen
// =====================================================================
export const DirA_BrandsActive = () => {
  const { brands, loadBrand, refresh } = useBrandDraft();
  const { navigate } = useRouter();
  const [filter, setFilter] = useBAState('all');
  // In-app confirm dialog, not window.confirm(): native dialogs are blocked
  // or auto-dismissed in several real embedding contexts (sandboxed iframes,
  // some in-app webviews, automated/preview browsers), which made this
  // button silently do nothing — confirm() returns false and the delete
  // never fires.
  const [pendingDelete, setPendingDelete] = useBAState<any>(null);
  const [deleting, setDeleting] = useBAState(false);
  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    const ok = await apiDeleteBrand(pendingDelete.id);
    setDeleting(false);
    setPendingDelete(null);
    if (ok) refresh();
  };
  const filters = [
    { key: 'all', label: 'All', count: brands.length },
    { key: 'live', label: 'Live', count: brands.filter((b: any) => b.status === 'live').length },
    { key: 'draft', label: 'Drafts', count: brands.filter((b: any) => b.status === 'draft').length },
  ];
  const shown = brands.filter((b: any) => (filter === 'all' ? true : b.status === filter));

  return (
    <AShell activeNav="brands" breadcrumb={['Brands']}>
      <div style={{ height: '100%', overflowY: 'auto' }}>
        <div className="main-pad" style={{ padding: '44px 56px 64px', display: 'flex', flexDirection: 'column', gap: 32 }}>

          {/* ── Header ─────────────────────────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 32, flexWrap: 'wrap' }}>
            <div style={{ minWidth: 0 }}>
              <div className="eyebrow" style={{ color: 'var(--fg-3)', marginBottom: 12 }}>Library · {brands.length} {brands.length === 1 ? 'brand' : 'brands'}</div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 52, letterSpacing: '-0.04em', lineHeight: 1, margin: 0, color: '#000' }}>
                Your brands.
              </h1>
              <p style={{ fontSize: 16, color: 'var(--fg-2)', marginTop: 14, maxWidth: 560, lineHeight: 1.5 }}>
                Every identity you&apos;ve built with Fluid — logos, palettes, type and guidelines — kept in one place. Open one to keep editing, or export the whole kit.
              </p>
            </div>
            <button style={{ padding: '12px 18px', borderRadius: 12, background: '#000', color: '#fff', fontSize: 14, fontWeight: 600, boxShadow: '0 1px 0 rgba(255,255,255,.1) inset, 0 8px 20px rgba(0,0,0,.18)', display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', flex: '0 0 auto' }}>
              <PlusIcon size={14} /> New brand
            </button>
          </div>

          {/* ── Toolbar ────────────────────────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18, borderBottom: '1px solid var(--line)', paddingBottom: 18 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {filters.map((f) => {
                const active = filter === f.key;
                return (
                  <button key={f.key} onClick={() => setFilter(f.key)} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: 999,
                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    background: active ? '#000' : 'var(--bg-elev)',
                    color: active ? '#fff' : 'var(--fg-2)',
                    boxShadow: active ? 'none' : 'inset 0 0 0 1px var(--line)',
                    transition: 'background .15s, color .15s',
                  }}>
                    {f.label}
                    <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: active ? 'rgba(255,255,255,.6)' : 'var(--fg-4)' }}>{f.count}</span>
                  </button>
                );
              })}
            </div>
            <button style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 12px', borderRadius: 10, background: 'transparent', color: 'var(--fg-2)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', flex: '0 0 auto' }}>
              Recently edited <BA_IcoChevDown />
            </button>
          </div>

          {/* ── Brand grid / empty state ───────────────────────────── */}
          {brands.length === 0 ? (
            <BA_EmptyState onCreate={() => location.assign(CHAT)} />
          ) : (
            <div className="bacard-grid">
              {shown.map((b: any) => (
                <BA_RealBrandCard
                  key={b.id}
                  brand={b}
                  onOpen={() => {
                    // A brand-kit conversation lives at its own URL, not in
                    // this hash router — resume it there (finished or not)
                    // rather than dropping it into the legacy step wizard below.
                    if (isBrandKitBrand(b)) {
                      location.assign(CHAT + '?brand=' + b.id);
                      return;
                    }
                    loadBrand(b.id);
                    const step = b.data && b.data.workflow === 'logo'
                      ? 'logo-brief'
                      : (b.status === 'live' ? 'step5' : ('step' + (b.step || 1)));
                    navigate(step);
                  }}
                  onDelete={() => setPendingDelete(b)}
                />
              ))}
            </div>
          )}

          {/* ── Slim create strip ──────────────────────────────────── */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 28,
            background: 'var(--bg-elev)', borderRadius: 18, padding: '22px 26px',
            boxShadow: 'var(--shadow-xs), inset 0 0 0 1px var(--line)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: 11, background: '#000', color: '#fff', flex: '0 0 40px' }}>
                <Sparkle size={16} color="#fff" />
              </span>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, letterSpacing: '-0.02em', color: '#000' }}>Start another brand</div>
                <div style={{ fontSize: 13, color: 'var(--fg-3)', marginTop: 2 }}>Brief to full identity in about 60 seconds — or browse 28 starter kits.</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flex: '0 0 auto' }}>
              <button style={{ padding: '10px 16px', borderRadius: 11, background: 'transparent', color: 'var(--fg-1)', fontSize: 13.5, fontWeight: 600, boxShadow: 'inset 0 0 0 1px var(--line-strong)', cursor: 'pointer' }}>
                Browse kits
              </button>
              <button style={{ padding: '10px 16px', borderRadius: 11, background: '#000', color: '#fff', fontSize: 13.5, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                New brand <BA_IcoArrow s={13} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {pendingDelete && (
        <BA_DeleteConfirmDialog
          name={brandDisplayName(pendingDelete)}
          busy={deleting}
          onCancel={() => !deleting && setPendingDelete(null)}
          onConfirm={confirmDelete}
        />
      )}
    </AShell>
  );
};

// Destructive-action confirmation, styled like the rest of the app rather
// than a native window.confirm() — which several real embedding contexts
// (sandboxed iframes, in-app webviews, automated browsers) suppress and
// auto-resolve to `false`, silently breaking delete.
const BA_DeleteConfirmDialog = ({ name, busy, onCancel, onConfirm }: any) => {
  const panelRef = React.useRef<HTMLDivElement | null>(null);
  const titleId = React.useId();
  const descId = React.useId();

  // #171: this was a bare overlay div — no dialog role, no way to dismiss it
  // from the keyboard, and focus left behind on the page underneath. It now
  // takes focus on open, keeps Tab inside itself while it is up, closes on
  // Escape, and hands focus back to whatever opened it.
  React.useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    panel?.querySelector<HTMLButtonElement>('button:not([disabled])')?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (!busy) onCancel();
        return;
      }
      if (e.key !== 'Tab' || !panel) return;
      const focusable = panel.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [busy, onCancel]);

  return (
  <div
    onClick={onCancel}
    style={{
      position: 'fixed', inset: 0, zIndex: 80,
      background: 'rgba(14,15,18,.45)', backdropFilter: 'blur(2px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}
  >
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descId}
      onClick={(e) => e.stopPropagation()}
      style={{
        width: '100%', maxWidth: 380, background: '#fff', borderRadius: 18,
        boxShadow: '0 24px 60px rgba(0,0,0,.28), inset 0 0 0 1px var(--line)',
        padding: 24, display: 'flex', flexDirection: 'column', gap: 16,
      }}
    >
      <div>
        <div id={titleId} style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, letterSpacing: '-0.02em', color: '#000' }}>
          Delete &ldquo;{name}&rdquo;?
        </div>
        <div id={descId} style={{ fontSize: 13.5, color: 'var(--fg-3)', marginTop: 8, lineHeight: 1.5 }}>
          This permanently removes the brand and everything generated for it — logo, palette, type, guidelines. This can&rsquo;t be undone.
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button
          onClick={onCancel}
          disabled={busy}
          style={{
            padding: '10px 16px', borderRadius: 11, background: 'transparent', color: 'var(--fg-1)',
            fontSize: 13.5, fontWeight: 600, boxShadow: 'inset 0 0 0 1px var(--line-strong)',
            border: 0, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1,
          }}
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={busy}
          style={{
            padding: '10px 16px', borderRadius: 11, background: '#A8421F', color: '#fff',
            fontSize: 13.5, fontWeight: 600, border: 0, cursor: busy ? 'default' : 'pointer',
            opacity: busy ? 0.7 : 1, display: 'inline-flex', alignItems: 'center', gap: 8,
          }}
        >
          {busy ? <Thinking /> : null} {busy ? 'Deleting…' : 'Delete brand'}
        </button>
      </div>
    </div>
  </div>
  );
};

async function apiDeleteBrand(id: any) {
  try {
    const r = await fetch('/api/brands/' + id, { method: 'DELETE' });
    return r.ok;
  } catch { return false; }
}

if (typeof document !== 'undefined' && !document.getElementById('brands-active-css')) {
  const s = document.createElement('style');
  s.id = 'brands-active-css';
  s.textContent = `
    .bacard-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 22px; }
    @media (max-width: 1040px) { .bacard-grid { grid-template-columns: 1fr; } }
    /* Now that the content column fills large displays, two columns would
       stretch each card past ~800px. Add a third instead of inflating them. */
    @media (min-width: 1500px) { .bacard-grid { grid-template-columns: repeat(3, 1fr); } }
    .bacard {
      background: var(--bg-elev); border-radius: 20px; overflow: hidden;
      box-shadow: var(--shadow-sm), inset 0 0 0 1px var(--line);
      display: flex; flex-direction: column; cursor: pointer;
      transition: transform .2s var(--ease-out), box-shadow .2s var(--ease-out);
    }
    .bacard:hover { transform: translateY(-4px); box-shadow: var(--shadow-md), inset 0 0 0 1px var(--line); }
    .bacard-hero { position: relative; overflow: hidden; }
    .bacard-pin {
      position: absolute; top: 12px; left: 12px; z-index: 3;
      width: 24px; height: 24px; border-radius: 8px;
      background: rgba(255,255,255,.9); color: #16181C;
      display: inline-flex; align-items: center; justify-content: center;
      box-shadow: 0 2px 8px rgba(0,0,0,.18);
    }
    .bacard-overlay {
      position: absolute; inset: 0; z-index: 2;
      display: flex; align-items: flex-end; justify-content: flex-end; gap: 8px;
      padding: 16px; opacity: 0; transition: opacity .2s var(--ease-out);
      background: linear-gradient(to top, rgba(0,0,0,.28), rgba(0,0,0,0) 42%);
    }
    .bacard:hover .bacard-overlay { opacity: 1; }
    .bacard-open {
      display: inline-flex; align-items: center; gap: 7px; border: 0; cursor: pointer;
      padding: 10px 16px; border-radius: 11px; background: #fff; color: #16181C;
      font-size: 13.5px; font-weight: 600; box-shadow: 0 4px 14px rgba(0,0,0,.22);
      transition: transform .12s var(--ease-out);
    }
    .bacard-open:hover { transform: scale(1.03); }
    .bacard-export {
      width: 38px; height: 38px; border-radius: 11px; border: 0; cursor: pointer;
      background: rgba(255,255,255,.94); color: #16181C;
      display: inline-flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 14px rgba(0,0,0,.22);
      transition: transform .12s var(--ease-out);
    }
    .bacard-export:hover { transform: scale(1.06); }
    .bacard-foot { padding: 18px 20px 20px; }
  `;
  document.head.appendChild(s);
}
