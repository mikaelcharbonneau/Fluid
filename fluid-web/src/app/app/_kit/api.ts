"use client";

// Extracted from the original single-file Prototype.tsx as part of #175's
// route split. The code below is unchanged; only the import/export header
// around it is new.

import { runStreamed } from "./activity";

// Any token-spending request may have changed the balance (spent on success,
// or hit zero on a 402). Nudge the provider to re-read it for the top-bar pill,
// and raise a distinct signal when the request was refused for lack of tokens
// so the app can surface a single actionable "top up" banner.
export function signalBalanceChanged(code: any) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event('fluid:balance-changed'));
  if (code === 'no_tokens') window.dispatchEvent(new Event('fluid:no-tokens'));
}

// Phase 3 — inline AI assists (rewrite brief, suggest audience/competitors,
// pick a Step 2 option). Returns { result } or { error, code }.
export async function apiAssist(brandId: any, task: any, options?: any) {
  try {
    const r = await fetch('/api/generate/assist', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brandId, task, options }),
    });
    const j = await r.json().catch(() => ({}));
    signalBalanceChanged(j.code);
    if (!r.ok) return { error: j.error || 'Assist failed.', code: j.code };
    return { result: j.result || {} };
  } catch { return { error: 'Network error.' }; }
}

// Logo studio · divergence — six pencil croquis based on the next ordered
// batch of references the client liked.
export async function apiGenerateLogoBoard(brandId: any, config: any, fresh: any) {
  const out = await runStreamed(
    'Sketching the board',
    () => fetch('/api/generate/logo/board', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brandId, config: config || {}, reset: !!fresh }),
    }),
    'Sketching the board failed.',
  );
  signalBalanceChanged(out.code);
  if (out.error) return { error: out.error, code: out.code };
  const j = out.data || {};
  return { board: j.board || [], drawn: j.drawn || 0, requested: j.requested || 0, briefed: j.briefed || 0, remaining: j.remaining };
}

export async function apiRepairLogoBoard(brandId: any) {
  const out = await runStreamed(
    'Repairing concept images',
    () => fetch('/api/generate/logo/board/repair', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brandId }),
    }),
    'Could not repair the concept images.',
  );
  if (out.error) return { error: out.error, code: out.code };
  return { board: (out.data || {}).board || [] };
}

// Logo studio · Phase 2 — develop ONE chosen concept into the briefed versions,
// each in the colours the client set for it.
export async function apiRefineLogoSketches(brandId: any, conceptId: any, versions: any) {
  const out = await runStreamed(
    'Refining the concept',
    () => fetch('/api/generate/logo/refine', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brandId, conceptId, versions: versions || [] }),
    }),
    'Refinement failed.',
  );
  signalBalanceChanged(out.code);
  if (out.error) return { error: out.error, code: out.code };
  return { finalists: (out.data || {}).finalists || [] };
}

// Logo studio · Phase 3 — trace the client's chosen concept into real vectors.
export async function apiVectorizeLogo(brandId: any, conceptId: any) {
  try {
    const r = await fetch('/api/generate/logo/vectorize', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brandId, conceptId }),
    });
    const j = await r.json().catch(() => ({}));
    signalBalanceChanged(j.code);
    if (!r.ok) return { error: j.error || 'Vectorization failed.', code: j.code };
    return { svg: j.svg || '', url: j.url || '' };
  } catch { return { error: 'Network error.' }; }
}

