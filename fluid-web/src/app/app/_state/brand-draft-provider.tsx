"use client";

// Extracted from the original single-file Prototype.tsx as part of #175's
// route split. The code below is unchanged; only the import/export header
// around it is new.

import React from "react";
import { deriveBrandName, resolveBrandName } from "../_kit/brand";
import { BrandDraftCtx } from "./brand-draft-context";
import { useRouter } from "./router-context";
import { makeToast } from "./toast";

// Raised when a generation is refused for lack of tokens. A single fixed
// banner (rather than five per-step error variants) with a direct path to top up.
const NoTokensBanner = ({ onClose }: any) => {
  const { navigate } = useRouter();
  const goBilling = () => {
    onClose();
    navigate('settings', { tab: 'billing' });
  };
  return (
    <div style={{
      position: 'fixed', left: '50%', bottom: 24, transform: 'translateX(-50%)',
      zIndex: 9999, display: 'flex', alignItems: 'center', gap: 16,
      padding: '12px 14px 12px 18px', borderRadius: 14,
      background: '#111', color: '#fff', boxShadow: '0 12px 40px rgba(0,0,0,.28)',
      fontSize: 13, maxWidth: 'calc(100vw - 32px)',
    }}>
      <span>You’re out of tokens. Subscribe for a monthly refill to keep generating.</span>
      <button onClick={goBilling} style={{ padding: '8px 14px', borderRadius: 9, background: '#fff', color: '#111', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', border: 0, whiteSpace: 'nowrap' }}>Manage billing</button>
      <button onClick={onClose} aria-label="Dismiss" style={{ background: 'transparent', border: 0, color: 'rgba(255,255,255,.6)', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 2px' }}>×</button>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════
// Brand persistence (Phase 2b) — talks to /api/brands, holds the current
// draft, and autosaves as the user moves through the wizard.
// ══════════════════════════════════════════════════════════════════════
async function apiListBrands() {
  try {
    const r = await fetch('/api/brands', { cache: 'no-store' });
    if (!r.ok) return [];
    return (await r.json()).brands || [];
  } catch { return []; }
}

async function apiCreateBrand(body: any) {
  try {
    const r = await fetch('/api/brands', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}),
    });
    if (!r.ok) return null;
    return (await r.json()).brand;
  } catch { return null; }
}

async function apiUpdateBrand(id: any, patch: any) {
  try {
    const r = await fetch('/api/brands/' + id, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (!r.ok) return null;
    return (await r.json()).brand;
  } catch { return null; }
}

async function apiGetMe() {
  try {
    const r = await fetch('/api/me', { cache: 'no-store' });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

export function BrandDraftProvider({ children }: any) {
  const { route } = useRouter();
  const [brands, setBrands] = React.useState<any[]>([]);
  const [draft, setDraft] = React.useState<any>(null);
  const [user, setUser] = React.useState<any>(null);
  const [billing, setBilling] = React.useState<any>(null); // { tier, balance, monthlyTokens }
  const draftRef = React.useRef<any>(draft);
  // Deliberately synchronous, not a useEffect: setField's debounced save
  // timer and the "load the right kind of draft" / "persist wizard
  // progress" effects below all assume draftRef.current is already current
  // by the time they run in this same commit. This is the app's core brand
  // autosave path with no live-backend test coverage to safely verify a
  // timing change against yet — deferring to #175, when this state moves
  // out of this file into its own tested module.
  // eslint-disable-next-line react-hooks/refs
  draftRef.current = draft;
  const saveTimer = React.useRef<any>(null);
  const pendingPatch = React.useRef<any>({});

  const refresh = React.useCallback(async () => {
    setBrands(await apiListBrands());
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount, see load() above
  React.useEffect(() => { refresh(); }, [refresh]);
  React.useEffect(() => { apiGetMe().then(setUser); }, []);

  // Token balance — shown in the top bar and refreshed after every generation.
  const refreshBalance = React.useCallback(async () => {
    try {
      const r = await fetch('/api/billing/status', { cache: 'no-store' });
      if (r.ok) setBilling(await r.json());
    } catch { /* keep the last known balance */ }
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount, see load() above
  React.useEffect(() => { refreshBalance(); }, [refreshBalance]);
  // Generation wrappers dispatch this after any token-spending request.
  React.useEffect(() => {
    const onChanged = () => refreshBalance();
    window.addEventListener('fluid:balance-changed', onChanged);
    return () => window.removeEventListener('fluid:balance-changed', onChanged);
  }, [refreshBalance]);

  // If the user arrived from a paid plan CTA on the marketing site, signup
  // stashed the tier — send them straight to Stripe checkout for it, once.
  React.useEffect(() => {
    let plan;
    try { plan = localStorage.getItem('fluid_intended_plan'); } catch { plan = null; }
    if (plan !== 'starter' && plan !== 'pro') return;
    try { localStorage.removeItem('fluid_intended_plan'); } catch { /* ignore */ }
    (async () => {
      try {
        const r = await fetch('/api/billing/checkout', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tier: plan }),
        });
        const j = await r.json().catch(() => ({}));
        if (r.ok && j.url) window.location.assign(j.url);
      } catch { /* stay in the app; they can subscribe from Settings → Billing */ }
    })();
  }, []);

  // A request refused for lack of tokens raises a single "top up" banner.
  const [noTokens, setNoTokens] = React.useState(false);
  React.useEffect(() => {
    const onNoTokens = () => setNoTokens(true);
    window.addEventListener('fluid:no-tokens', onNoTokens);
    return () => window.removeEventListener('fluid:no-tokens', onNoTokens);
  }, []);

  // Debounced field autosave. Calls made within the same debounce window are
  // merged into one pending patch rather than replacing each other — e.g.
  // chooseName() sets name_choice then name back to back, and both must reach
  // the server. A single shared timer that resent only its own call's patch
  // silently dropped every key but the last one: the field still looked
  // chosen locally (setDraft merges), but only the final key was ever saved.
  const setField = React.useCallback((key: any, value: any) => {
    // Editing the brief refreshes the derived brand name — but only while that
    // name is still the derived placeholder. Once a real name exists, the brief
    // must not overwrite it: for brands whose name_choice went missing, `name`
    // is the only copy left, and re-deriving would destroy it for good.
    const cur = draftRef.current || {};
    const nameIsPlaceholder = resolveBrandName(cur) === null;
    const patch = (key === 'brief' && nameIsPlaceholder)
      ? { brief: value, name: deriveBrandName(value) }
      : { [key]: value };
    setDraft((prev: any) => (prev ? { ...prev, ...patch } : prev));
    const d = draftRef.current;
    if (!d || !d.id) {
      // No draft to write to, so this click changed nothing and never will.
      // It used to return in silence, which looks exactly like a save: the
      // card highlights from local state and reverts the moment the screen
      // re-reads the draft. Say so instead of losing the work quietly.
      console.warn('Ignored an edit with no draft loaded:', Object.keys(patch).join(', '));
      makeToast('That change was not saved — reopen the brand and try again.');
      return;
    }
    pendingPatch.current = { ...pendingPatch.current, ...patch };
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const toSave = pendingPatch.current;
      pendingPatch.current = {};
      const updated = await apiUpdateBrand(d.id, toSave);
      if (updated) {
        refresh();
        return;
      }
      // A failed save used to be dropped here without a word: the patch had
      // already been cleared from the queue, so the edit was gone for good
      // while the screen still showed it — until something re-read the draft
      // and it reverted. Put the keys back so the next save carries them, and
      // say that it happened.
      pendingPatch.current = { ...toSave, ...pendingPatch.current };
      console.warn('Failed to save:', Object.keys(toSave).join(', '));
      makeToast('Could not save that change — it will retry with your next edit.');
    }, 500);
  }, [refresh]);

  /**
   * Merge keys into the brand's `data` blob.
   *
   * Every caller used to spread a copy of `data` captured when its screen last
   * rendered, spreading it into setField('data', ...). That is only
   * correct while nothing else has written since that render, and the logo flow
   * breaks the assumption constantly: a screen reads `data`, a generation route
   * writes a creative platform to the same brand, the screen then saves its stale copy.
   * Reading from the ref means the base is always the live draft.
   */
  const setData = React.useCallback((patch: any) => {
    const cur = (draftRef.current && draftRef.current.data) || {};
    setField('data', { ...cur, ...patch });
  }, [setField]);

  const startNew = React.useCallback(async (input?: any) => {
    const b = await apiCreateBrand(input || { step: 1 });
    if (b) { setDraft(b); refresh(); }
    return b;
  }, [refresh]);

  const loadBrand = React.useCallback((id: any) => {
    const b = brands.find((x) => x.id === id);
    if (b) setDraft(b);
    return b;
  }, [brands]);

  // Clear the draft whenever we leave a creation flow, so each new project
  // begins fresh (resume re-selects an explicit saved draft).
  React.useEffect(() => {
    // Reacting to route changes by clearing state IS the intent here, not a
    // side effect to hoist out.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!/^step[1-5]$/.test(route) && !['logo-brief', 'logo-direction', 'logo-type', 'logo-references', 'logo-sketches', 'logo-refine', 'logo-export'].includes(route)) setDraft(null);
  }, [route]);

  // Create the correct kind of draft when either brief screen opens.
  React.useEffect(() => {
    if (route === 'step1' && !draftRef.current) startNew();
    if (route === 'logo-brief' && !draftRef.current) {
      startNew({ step: 1, data: { workflow: 'logo' } });
    }
  }, [route, startNew]);

  // Persist wizard progress; mark the brand "live" at the kit.
  React.useEffect(() => {
    const d = draftRef.current;
    if (!d || !d.id || !/^step[1-5]$/.test(route)) return;
    const step = Number(route.slice(4));
    const patch: any = { step };
    if (route === 'step5') patch.status = 'live';
    apiUpdateBrand(d.id, patch).then((u) => { if (u) { setDraft(u); refresh(); } });
  }, [route]);

  const value = { brands, draft, user, billing, refreshBalance, setField, setData, startNew, loadBrand, refresh };
  return (
    <BrandDraftCtx.Provider value={value}>
      {children}
      {noTokens && <NoTokensBanner onClose={() => setNoTokens(false)} />}
    </BrandDraftCtx.Provider>
  );
}

