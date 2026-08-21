"use client";

// Extracted from the original single-file Prototype.tsx as part of #175's
// route split. The code below is unchanged; only the import/export header
// around it is new.

import React from "react";
import { useSearchParams } from "next/navigation";
import { AShell } from "../_kit/shell";
import { Chip } from "../_kit/ui";
import { useBrandDraft } from "../_state/brand-draft-context";
import type { BillingStatus } from "../_state/types";

// ------------------------------------------------------------------
// 09-settings
// ------------------------------------------------------------------
// =====================================================================
// Direction A · Settings
//
// A focused, single-purpose settings surface that lives inside AShell
// (activeNav="settings"). A slim settings sub-nav on the left switches
// between sections; the panel on the right holds the controls.
//
// The distinctive section is "Fluid AI" — how the agent behaves, how much
// of its reasoning is shown, and the defaults it reaches for. Everything
// else (Account, Workspace, Members, Plan, Integrations, Notifications)
// uses the same calm card + black-accent vocabulary as the rest of A.
// =====================================================================

const { useState: useSetState } = React;

// ---------------------------------------------------------------------
// Form primitives
// ---------------------------------------------------------------------

// Self-contained pill toggle. Black when on, hairline well when off.
// `label` is not optional in practice: the control is a bare pill with no
// text of its own, so without it a screen reader announces just "button"
// (#171 — axe flagged exactly this). Call sites pass their Row's title.
interface ToggleProps {
  defaultOn?: boolean;
  label: string;
}

const Toggle = ({ defaultOn = false, label }: ToggleProps) => {
  const [on, setOn] = useSetState(defaultOn);
  return (
    <button
      onClick={() => setOn((v) => !v)}
      aria-pressed={on}
      aria-label={label}
      style={{
        width: 42, height: 24, borderRadius: 999, padding: 2, flex: '0 0 42px',
        background: on ? '#000' : 'var(--bg-sunken)',
        boxShadow: on ? 'none' : 'inset 0 0 0 1px var(--line-strong)',
        cursor: 'pointer', transition: 'background .18s var(--ease-out)',
        display: 'flex', alignItems: 'center',
      }}
    >
      <span style={{
        width: 20, height: 20, borderRadius: 999, background: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,.25)',
        transform: on ? 'translateX(18px)' : 'translateX(0)',
        transition: 'transform .18s var(--ease-spring)',
      }} />
    </button>
  );
};

// Segmented control — pill well with a white "selected" chip.
interface SegmentedProps<T extends string> {
  options: readonly T[];
  defaultValue?: T;
  onChange?: (value: T) => void;
  size?: 'sm' | 'md';
}

const Segmented = <T extends string>({ options, defaultValue, onChange, size = 'md' }: SegmentedProps<T>) => {
  const [val, setVal] = useSetState(defaultValue ?? options[0]);
  const pad = size === 'sm' ? '6px 12px' : '8px 16px';
  const fs = size === 'sm' ? 12 : 13;
  return (
    <div style={{
      display: 'inline-flex', gap: 3, padding: 3, borderRadius: 999,
      background: 'var(--bg-sunken)', boxShadow: 'inset 0 0 0 1px var(--line)',
    }}>
      {options.map((o) => {
        const active = o === val;
        return (
          <button key={o} onClick={() => { setVal(o); onChange?.(o); }} style={{
            padding: pad, borderRadius: 999, fontSize: fs, fontWeight: 600,
            letterSpacing: '-0.005em', cursor: 'pointer', whiteSpace: 'nowrap',
            background: active ? 'var(--bg-elev)' : 'transparent',
            color: active ? 'var(--fg-1)' : 'var(--fg-3)',
            boxShadow: active ? 'var(--shadow-xs), inset 0 0 0 1px var(--line)' : 'none',
            transition: 'background .15s, color .15s',
          }}>{o}</button>
        );
      })}
    </div>
  );
};

// Text-input look (read-only specimen — this is a static prototype).
interface FieldProps {
  label: string;
  value: React.ReactNode;
  sub?: string;
  suffix?: React.ReactNode;
  mono?: boolean;
  wide?: boolean;
}

const Field = ({ label, value, sub, suffix, mono, wide }: FieldProps) => (
  <label style={{ display: 'flex', flexDirection: 'column', gap: 7, flex: wide ? '1 1 100%' : '1 1 240px', minWidth: 0 }}>
    <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fg-2)' }}>{label}</span>
    <span style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '11px 14px', borderRadius: 11, background: 'var(--bg)',
      boxShadow: 'inset 0 0 0 1px var(--line)',
      fontSize: 14, color: value ? 'var(--fg-1)' : 'var(--fg-4)',
      fontFamily: mono ? 'var(--font-mono)' : 'inherit',
    }}>
      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
      {suffix}
    </span>
    {sub && <span style={{ fontSize: 11.5, color: 'var(--fg-3)' }}>{sub}</span>}
  </label>
);

// Select-look field (chevron on the right).
const SelectField = ({ label, value, wide }: Pick<FieldProps, 'label' | 'value' | 'wide'>) => (
  <Field label={label} value={value} wide={wide} suffix={
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--fg-4)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
  } />
);

// A control row: title + description on the left, control on the right.
interface RowProps {
  title: string;
  desc?: string;
  children: React.ReactNode;
  last?: boolean;
}

const Row = ({ title, desc, children, last }: RowProps) => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 28,
    padding: '18px 0', borderBottom: last ? 'none' : '1px solid var(--line)',
  }}>
    <div style={{ minWidth: 0, maxWidth: 480 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-1)' }}>{title}</div>
      {desc && <div style={{ fontSize: 12.5, color: 'var(--fg-3)', marginTop: 3, lineHeight: 1.45 }}>{desc}</div>}
    </div>
    <div style={{ flex: '0 0 auto' }}>{children}</div>
  </div>
);

// Card wrapper + optional header.
interface CardProps {
  title?: string;
  desc?: string;
  children: React.ReactNode;
  pad?: number;
  accent?: boolean;
}

const Card = ({ title, desc, children, pad = 24, accent }: CardProps) => (
  <section style={{
    background: 'var(--bg-elev)', borderRadius: 20,
    boxShadow: 'var(--shadow-xs), inset 0 0 0 1px var(--line)',
    overflow: 'hidden',
  }}>
    {accent && <div style={{ height: 3, background: 'var(--fl-accent)' }} />}
    {title && (
      <div style={{ padding: `${pad}px ${pad}px 0` }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, letterSpacing: '-0.02em', color: '#000', margin: 0 }}>{title}</h3>
        {desc && <p style={{ fontSize: 13, color: 'var(--fg-3)', margin: '6px 0 0', lineHeight: 1.5, maxWidth: 560 }}>{desc}</p>}
      </div>
    )}
    <div style={{ padding: pad }}>{children}</div>
  </section>
);

// Sticky-feeling footer with unsaved-changes affordance.
const SaveBar = () => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20,
    padding: '14px 18px', borderRadius: 14, background: 'var(--bg-elev)',
    boxShadow: 'var(--shadow-sm), inset 0 0 0 1px var(--line)',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 12.5, color: 'var(--fg-3)' }}>
      <span style={{ width: 7, height: 7, borderRadius: 99, background: 'var(--fluid-coral)' }} />
      You have unsaved changes
    </div>
    <div style={{ display: 'flex', gap: 10 }}>
      <button style={{ padding: '9px 16px', borderRadius: 10, background: 'transparent', color: 'var(--fg-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: 'inset 0 0 0 1px var(--line-strong)' }}>Cancel</button>
      <button style={{ padding: '9px 18px', borderRadius: 10, background: '#000', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 6px 16px rgba(0,0,0,.16)' }}>Save changes</button>
    </div>
  </div>
);

interface SectionHeadProps {
  eyebrow: string;
  title: string;
  desc?: string;
}

const SectionHead = ({ eyebrow, title, desc }: SectionHeadProps) => (
  <div style={{ marginBottom: 6 }}>
    <div className="eyebrow" style={{ color: 'var(--fg-3)', marginBottom: 12 }}>{eyebrow}</div>
    <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 38, letterSpacing: '-0.035em', lineHeight: 1, margin: 0, color: '#000' }}>{title}</h1>
    {desc && <p style={{ fontSize: 15, color: 'var(--fg-2)', marginTop: 12, maxWidth: 560, lineHeight: 1.5 }}>{desc}</p>}
  </div>
);

// ---------------------------------------------------------------------
// Section: Account
// ---------------------------------------------------------------------
const SecAccount = () => {
  const { user } = useBrandDraft();
  const name = (user && user.name) || '';
  const email = (user && user.email) || '';
  const initial = (user && user.initial) || '·';
  return (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
    <SectionHead eyebrow="Settings · Account" title="Account." desc="Your personal profile and sign-in. This is how you appear across Fluid." />

    <Card title="Profile">
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, paddingBottom: 22, marginBottom: 4, borderBottom: '1px solid var(--line)' }}>
        <div style={{ width: 64, height: 64, borderRadius: 999, background: '#000', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26, flex: '0 0 64px' }}>{initial}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: '#000', letterSpacing: '-0.02em' }}>{name || 'Your name'}</div>
          <div style={{ fontSize: 12.5, color: 'var(--fg-3)', marginTop: 2 }}>PNG, JPG or SVG · up to 2&nbsp;MB</div>
        </div>
        <div style={{ display: 'flex', gap: 9 }}>
          <button style={{ padding: '9px 14px', borderRadius: 10, background: 'var(--bg-sunken)', color: 'var(--fg-1)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>Change photo</button>
          <button style={{ padding: '9px 14px', borderRadius: 10, background: 'transparent', color: 'var(--fg-3)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>Remove</button>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, paddingTop: 18 }}>
        <Field label="Full name" value={name || '—'} />
        <Field label="Email" value={email || '—'} suffix={<Chip tone="live">Verified</Chip>} />
        <SelectField label="Language" value="English (US)" />
        <SelectField label="Time zone" value="GMT−8 · Pacific" />
      </div>
    </Card>

    <Card title="Security">
      <Row title="Two-factor authentication" desc="Require a one-time code from your authenticator app at sign-in.">
        <Toggle label="Two-factor authentication" defaultOn />
      </Row>
      <Row title="Password" desc="Last changed 4 months ago.">
        <button style={{ padding: '9px 14px', borderRadius: 10, background: 'var(--bg-sunken)', color: 'var(--fg-1)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>Update password</button>
      </Row>
      <Row title="Active sessions" desc="2 devices currently signed in." last>
        <button style={{ padding: '9px 14px', borderRadius: 10, background: 'transparent', color: 'var(--fg-2)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', boxShadow: 'inset 0 0 0 1px var(--line-strong)' }}>Manage</button>
      </Row>
    </Card>

    <Card title="Session">
      <Row title="Log out" desc="Sign out of Fluid on this device." last>
        <form action="/api/auth/logout" method="post" data-no-route style={{ display: 'inline' }}>
          <button type="submit" style={{ padding: '9px 16px', borderRadius: 10, background: 'transparent', color: 'var(--destructive)', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', border: 'none', boxShadow: 'inset 0 0 0 1px rgba(214,69,69,0.4)' }}>Log out</button>
        </form>
      </Row>
    </Card>

    <SaveBar />
  </div>
  );
};

// ---------------------------------------------------------------------
// Section: Workspace
// ---------------------------------------------------------------------
const SecWorkspace = () => {
  const { user, brands } = useBrandDraft();
  const wsName = user && user.name ? user.name.trim().split(/\s+/)[0] + "'s workspace" : 'Your workspace';
  const wsInitial = (user && user.initial) || '·';
  const brandCount = brands.length + ' ' + (brands.length === 1 ? 'brand' : 'brands');
  return (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
    <SectionHead eyebrow="Settings · Workspace" title="Workspace." desc="The home for your brands, assets and guidelines." />

    <Card title="Identity">
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, paddingBottom: 22, marginBottom: 4, borderBottom: '1px solid var(--line)' }}>
        <div style={{ width: 64, height: 64, borderRadius: 16, background: 'var(--fl-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26, color: '#000', flex: '0 0 64px', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.08)' }}>{wsInitial}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: '#000', letterSpacing: '-0.02em' }}>{wsName}</div>
          <div style={{ fontSize: 12.5, color: 'var(--fg-3)', marginTop: 2 }}>{brandCount}</div>
        </div>
        <button style={{ padding: '9px 14px', borderRadius: 10, background: 'var(--bg-sunken)', color: 'var(--fg-1)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>Replace icon</button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, paddingTop: 18 }}>
        <Field label="Workspace name" value={wsName} />
        <SelectField label="Default language" value="English (US)" />
      </div>
    </Card>

    <Card title="Defaults">
      <Row title="New brand visibility" desc="Who can see a brand the moment it's created.">
        <Segmented options={["Private", "Team", "Public"]} defaultValue="Team" size="sm" />
      </Row>
      <Row title="Asset library" desc="Let everyone in the workspace reuse logos, palettes and type." last>
        <Toggle label="Asset library" defaultOn />
      </Row>
    </Card>

    <Card>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--destructive)' }}>Delete workspace</div>
          <div style={{ fontSize: 12.5, color: 'var(--fg-3)', marginTop: 3, maxWidth: 460, lineHeight: 1.45 }}>Permanently remove this workspace and all of its brands, assets and guidelines. This cannot be undone.</div>
        </div>
        <button style={{ padding: '9px 16px', borderRadius: 10, background: 'transparent', color: 'var(--destructive)', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: 'inset 0 0 0 1px rgba(214,69,69,.4)', flex: '0 0 auto' }}>Delete workspace</button>
      </div>
    </Card>
  </div>
  );
};

// ---------------------------------------------------------------------
// Section: Fluid AI  (the distinctive one)
// ---------------------------------------------------------------------
const StyleChip = ({ label, on }: { label: string; on?: boolean }) => (
  <button style={{
    padding: '8px 15px', borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: 'pointer',
    background: on ? '#000' : 'var(--bg-elev)', color: on ? '#fff' : 'var(--fg-2)',
    boxShadow: on ? 'none' : 'inset 0 0 0 1px var(--line)',
  }}>{label}</button>
);

const SecFluid = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
    <SectionHead eyebrow="Settings · Fluid AI" title="Fluid AI." desc="Shape how the agent works — how much of its thinking you see, and the defaults it reaches for when drafting a brand." />

    <Card accent title="Reasoning & behaviour" desc="Fluid narrates its choices in the bottom dock as it works. Tune how present that voice is.">
      <Row title="Show reasoning in the dock" desc="Stream Fluid's thinking as it drafts strategy, names and logos.">
        <Toggle label="Show reasoning in the dock" defaultOn />
      </Row>
      <Row title="Creativity" desc="How far Fluid strays from safe, conventional territory.">
        <Segmented options={["Measured", "Balanced", "Experimental"]} defaultValue="Balanced" size="sm" />
      </Row>
      <Row title="Auto-suggest next steps" desc="Light up adjacent cards with proposals as you fill one in.">
        <Toggle label="Auto-suggest next steps" defaultOn />
      </Row>
      <Row title="Live brand references" desc="Let Fluid look at real-world brands on the web for inspiration." last>
        <Toggle label="Live brand references" />
      </Row>
    </Card>

    <Card title="Generation defaults" desc="Where every new brand starts before you steer it.">
      <Row title="Default direction" desc="The aesthetic Fluid leans toward on the first pass.">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <StyleChip label="Minimal" on />
          <StyleChip label="Bold" />
          <StyleChip label="Playful" />
          <StyleChip label="Editorial" />
        </div>
      </Row>
      <Row title="Palette size" desc="How many colors a generated kit includes by default.">
        <Segmented options={["5", "6", "8"]} defaultValue="6" size="sm" />
      </Row>
      <Row title="Logo concepts per run" desc="Marks drafted each time you generate.">
        <Segmented options={["3", "6", "9"]} defaultValue="6" size="sm" />
      </Row>
      <Row title="Generation quality" desc="Higher quality is slower but more refined." last>
        <Segmented options={["Draft", "Standard", "High"]} defaultValue="Standard" size="sm" />
      </Row>
    </Card>

    <SaveBar />
  </div>
);

// ---------------------------------------------------------------------
// Section: Notifications
// ---------------------------------------------------------------------
interface NotificationRowProps {
  title: string;
  desc?: string;
  email?: boolean;
  app?: boolean;
  last?: boolean;
}

const NotifRow = ({ title, desc, email, app, last }: NotificationRowProps) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 24, padding: '15px 0', borderBottom: last ? 'none' : '1px solid var(--line)' }}>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-1)' }}>{title}</div>
      {desc && <div style={{ fontSize: 12.5, color: 'var(--fg-3)', marginTop: 2 }}>{desc}</div>}
    </div>
    {/* Both toggles in a row control the same notification, so the channel
        has to be part of the name or they announce identically. */}
    <div style={{ flex: '0 0 64px', display: 'flex', justifyContent: 'center' }}><Toggle label={title + ' — email'} defaultOn={email} /></div>
    <div style={{ flex: '0 0 64px', display: 'flex', justifyContent: 'center' }}><Toggle label={title + ' — in-app'} defaultOn={app} /></div>
  </div>
);

const SecNotifications = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
    <SectionHead eyebrow="Settings · Notifications" title="Notifications." desc="Choose what Fluid tells you about, and where it reaches you." />
    <Card title="Preferences">
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, paddingBottom: 6, borderBottom: '1px solid var(--line)' }}>
        <div style={{ flex: 1 }} />
        <div style={{ flex: '0 0 64px', textAlign: 'center', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--fg-3)' }}>Email</div>
        <div style={{ flex: '0 0 64px', textAlign: 'center', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--fg-3)' }}>In-app</div>
      </div>
      <NotifRow title="Brand generation complete" desc="When Fluid finishes drafting a brand or asset." email app />
      <NotifRow title="Comments & mentions" desc="When a teammate replies or @-mentions you." email app />
      <NotifRow title="Weekly summary" desc="A digest of activity across the workspace." email={false} app />
      <NotifRow title="Product updates" desc="New features and improvements from Fluid." email app={false} />
      <NotifRow title="Billing alerts" desc="Payment receipts and credit warnings." email app last />
    </Card>
  </div>
);

// ---------------------------------------------------------------------
// Settings shell — sub-nav + active section
// ---------------------------------------------------------------------
// ---------------------------------------------------------------------
// Section: Billing (Stripe)
// ---------------------------------------------------------------------
// Subscription tiers — kept in sync with src/lib/stripe.ts (TIERS).
const BILLING_TIERS = [
  { id: 'starter', name: 'Starter', tokens: 150, price: '$12', period: '/mo', blurb: 'For getting a brand off the ground.' },
  { id: 'pro', name: 'Pro', tokens: 500, price: '$36', period: '/mo', blurb: 'For agencies and frequent builders.', featured: true },
];

const TIER_LABEL = { free: 'Free', starter: 'Starter', pro: 'Pro' };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isBillingTier(value: unknown): value is keyof typeof TIER_LABEL {
  return value === 'free' || value === 'starter' || value === 'pro';
}

function parseBillingStatus(value: unknown): BillingStatus | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.tier !== 'string' ||
    typeof value.status !== 'string' ||
    typeof value.balance !== 'number' ||
    typeof value.monthlyTokens !== 'number'
  ) return null;
  return {
    tier: value.tier,
    status: value.status,
    balance: value.balance,
    monthlyTokens: value.monthlyTokens,
    current_period_end: typeof value.current_period_end === 'string' ? value.current_period_end : null,
  };
}

const SecBilling = () => {
  const [status, setStatus] = React.useState<BillingStatus | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState('');
  const [error, setError] = React.useState('');
  const justUpgraded = typeof window !== 'undefined' && /[?&]billing=success/.test(window.location.search);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/billing/status', { cache: 'no-store' });
      const j: unknown = await r.json().catch(() => ({}));
      setStatus(r.ok ? parseBillingStatus(j) : null);
    } catch { setStatus(null); }
    setLoading(false);
    // Keep the top-bar token pill in sync with what this page shows.
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('fluid:balance-changed'));
  }, []);
  // Fetch-on-mount / fetch-on-change: load() sets state once its request
  // resolves, not synchronously — this is the standard data-fetching effect
  // shape, not the cascading-render pattern this rule targets.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  React.useEffect(() => { load(); }, [load]);

  // POST a JSON body (checkout needs a tier); portal needs none.
  const go = async (path: string, which: string, body?: Record<string, string>) => {
    setBusy(which); setError('');
    try {
      const r = await fetch(path, {
        method: 'POST',
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const j: unknown = await r.json().catch(() => ({}));
      if (r.ok && isRecord(j) && typeof j.url === 'string') { window.location.assign(j.url); return; }
      setError(isRecord(j) && typeof j.error === 'string' ? j.error : "Couldn't continue. Please try again.");
    } catch { setError('Network error. Check your connection and try again.'); }
    setBusy('');
  };

  const tier: BillingTier = isBillingTier(status?.tier) ? status.tier : 'free';
  const isSubscriber = tier === 'starter' || tier === 'pro';
  const balance = (status && typeof status.balance === 'number') ? status.balance : 0;
  const monthly = (status && status.monthlyTokens) || 0;

  const primaryBtn = { padding: '10px 16px', borderRadius: 10, background: '#000', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 0 };
  const ghostBtn = { padding: '10px 16px', borderRadius: 10, background: 'transparent', color: 'var(--fg-1)', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: 'inset 0 0 0 1px var(--line-strong)', border: 0 };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionHead eyebrow="Settings · Billing" title="Billing." desc="Tokens power everything Fluid generates. Subscribe for a monthly refill." />

      {justUpgraded && (
        <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(68,217,199,.12)', boxShadow: 'inset 0 0 0 1px rgba(68,217,199,.35)', fontSize: 13, color: '#0E6B5E' }}>
          Thanks! Your payment is processing — your tokens and plan will update in a moment. <button onClick={load} style={{ background: 'transparent', border: 0, color: '#0E6B5E', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>Refresh</button>
        </div>
      )}

      <Card title="Token balance">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 34, color: '#000', lineHeight: 1 }}>{loading ? '—' : balance}</span>
              <span style={{ fontSize: 13, color: 'var(--fg-3)' }}>tokens left</span>
              <Chip tone={isSubscriber ? 'live' : 'neutral'}>{TIER_LABEL[tier]}</Chip>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--fg-3)', marginTop: 6 }}>
              {loading ? 'Loading…'
                : isSubscriber ? `Refills to ${monthly} tokens each billing month.`
                : 'Asset generation costs 3 tokens; smaller AI helpers cost 1. Subscribe for a monthly refill.'}
            </div>
          </div>
          {isSubscriber && (
            <button onClick={() => go('/api/billing/portal', 'portal')} disabled={!!busy} style={{ ...ghostBtn, opacity: busy ? 0.6 : 1 }}>{busy === 'portal' ? 'Opening…' : 'Manage subscription'}</button>
          )}
        </div>
        {error && <div style={{ marginTop: 12, fontSize: 12.5, color: 'var(--destructive)' }}>{error}</div>}
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        {BILLING_TIERS.map((t) => {
          const current = tier === t.id;
          return (
            <div key={t.id} style={{ padding: 22, borderRadius: 16, background: 'var(--surface-1)', boxShadow: t.featured ? 'inset 0 0 0 1.5px #000' : 'inset 0 0 0 1px var(--line)', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, color: '#000' }}>{t.name}</span>
                {t.featured && <Chip tone="live">Popular</Chip>}
                {current && <Chip tone="neutral">Current</Chip>}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28, color: '#000' }}>{t.price}</span>
                <span style={{ fontSize: 13, color: 'var(--fg-3)' }}>{t.period}</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--fg-1)', fontWeight: 600 }}>{t.tokens} tokens / month</div>
              <div style={{ fontSize: 12.5, color: 'var(--fg-3)', flex: 1 }}>{t.blurb}</div>
              <button
                onClick={() => go('/api/billing/checkout', 'checkout-' + t.id, { tier: t.id })}
                disabled={!!busy || current}
                style={{ ...(t.featured ? primaryBtn : ghostBtn), opacity: (busy || current) ? 0.6 : 1, cursor: current ? 'default' : 'pointer' }}
              >
                {current ? 'Current plan' : busy === 'checkout-' + t.id ? 'Starting…' : isSubscriber ? 'Switch to ' + t.name : 'Subscribe'}
              </button>
            </div>
          );
        })}
      </div>

      <div style={{ fontSize: 12, color: 'var(--fg-3)' }}>
        Every account starts with 20 free tokens. Unused tokens don’t roll over — each billing month resets to your plan’s allowance.
      </div>
    </div>
  );
};

const SETTINGS_NAV: Array<{ id: SettingsSection; label: string; d: React.ReactNode }> = [
  { id: 'account',      label: 'Account',         d: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></> },
  { id: 'billing',      label: 'Billing',         d: <><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></> },
  { id: 'workspace',    label: 'Workspace',       d: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></> },
  { id: 'fluid',        label: 'Fluid AI',        d: <><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" /></> },
  // Members, Plan/Billing and Integrations are hidden until those features
  // exist. The Integrations tab mapped an INTEGRATIONS list through an
  // IntegrationCard, neither of which was ever written — opening it threw.
  { id: 'notifications',label: 'Notifications',   d: <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" /></> },
];

type SettingsSection = 'account' | 'billing' | 'workspace' | 'fluid' | 'notifications';
type BillingTier = keyof typeof TIER_LABEL;

const SECTIONS: Record<SettingsSection, React.ComponentType> = {
  account: SecAccount,
  billing: SecBilling,
  workspace: SecWorkspace,
  fluid: SecFluid,
  notifications: SecNotifications,
};

function isSettingsSection(value: string): value is SettingsSection {
  return value in SECTIONS;
}

export const DirA_Settings = () => {
  // The open tab comes from the URL (?tab=billing), so the top-bar token pill
  // and the out-of-tokens banner can link straight to Billing — and so that
  // tab is shareable and survives a refresh. Before #175 this rode on a
  // `window.__fluidSettingsTab` global because /app#settings had nowhere to
  // put it.
  const requestedTab = useSearchParams().get('tab') || 'fluid';
  const [active, setActive] = useSetState<SettingsSection>(isSettingsSection(requestedTab) ? requestedTab : 'fluid');
  const ActiveSection = SECTIONS[active];
  return (
    <AShell activeNav="settings" breadcrumb={['Settings']}>
      <div style={{ height: '100%', overflowY: 'auto' }}>
        <div style={{ display: 'flex', gap: 0, minHeight: '100%' }}>

          {/* Settings sub-nav */}
          <aside style={{
            width: 244, flex: '0 0 244px', borderRight: '1px solid var(--line)',
            padding: '44px 16px', position: 'sticky', top: 0, alignSelf: 'flex-start',
          }}>
            <div className="eyebrow" style={{ color: 'var(--fg-3)', padding: '0 12px', marginBottom: 16 }}>Settings</div>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {SETTINGS_NAV.map((it) => {
                const on = active === it.id;
                return (
                  <button key={it.id} onClick={() => setActive(it.id)} style={{
                    display: 'flex', alignItems: 'center', gap: 11, padding: '10px 12px', borderRadius: 10,
                    background: on ? 'var(--bg-elev)' : 'transparent',
                    boxShadow: on ? 'var(--shadow-xs), inset 0 0 0 1px var(--line)' : 'none',
                    color: on ? 'var(--fg-1)' : 'var(--fg-3)',
                    fontSize: 13.5, fontWeight: on ? 600 : 500, cursor: 'pointer', textAlign: 'left',
                    transition: 'background .15s, color .15s',
                  }}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ flex: '0 0 17px', opacity: on ? 1 : 0.8 }}>{it.d}</svg>
                    {it.label}
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Active section */}
          <div style={{ flex: 1, minWidth: 0, padding: '44px 56px 56px', maxWidth: 840 }}>
            <ActiveSection />
          </div>
        </div>
      </div>
    </AShell>
  );
};
