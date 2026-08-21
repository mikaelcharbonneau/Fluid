"use client";

import React from "react";
import { BrandDraftCtx } from "./brand-draft-context";
import { useRouter } from "./router-context";

// Raised when a generation is refused for lack of tokens. A single fixed
// banner with a direct path to top up.
const NoTokensBanner = ({ onClose }: { onClose: () => void }) => {
  const { navigate } = useRouter();
  const goBilling = () => {
    onClose();
    navigate("settings", { tab: "billing" });
  };
  return (
    <div style={{
      position: "fixed", left: "50%", bottom: 24, transform: "translateX(-50%)",
      zIndex: 9999, display: "flex", alignItems: "center", gap: 16,
      padding: "12px 14px 12px 18px", borderRadius: 14,
      background: "#111", color: "#fff", boxShadow: "0 12px 40px rgba(0,0,0,.28)",
      fontSize: 13, maxWidth: "calc(100vw - 32px)",
    }}>
      <span>You’re out of tokens. Subscribe for a monthly refill to keep generating.</span>
      <button onClick={goBilling} style={{ padding: "8px 14px", borderRadius: 9, background: "#fff", color: "#111", fontSize: 12.5, fontWeight: 700, cursor: "pointer", border: 0, whiteSpace: "nowrap" }}>Manage billing</button>
      <button onClick={onClose} aria-label="Dismiss" style={{ background: "transparent", border: 0, color: "rgba(255,255,255,.6)", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "0 2px" }}>×</button>
    </div>
  );
};

async function apiListBrands() {
  try {
    const response = await fetch("/api/brands", { cache: "no-store" });
    if (!response.ok) return [];
    return (await response.json()).brands || [];
  } catch {
    return [];
  }
}

async function apiGetMe() {
  try {
    const response = await fetch("/api/me", { cache: "no-store" });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * Shared authenticated-app state.
 *
 * Brand creation now lives in the conversational `/app/chat` surface, which
 * owns its draft and resume state. This provider intentionally keeps only the
 * library, account, and billing data needed by the surrounding app shell.
 */
export function BrandDraftProvider({ children }: { children: React.ReactNode }) {
  const [brands, setBrands] = React.useState<any[]>([]);
  const [user, setUser] = React.useState<any>(null);
  const [billing, setBilling] = React.useState<any>(null);

  const refresh = React.useCallback(async () => {
    setBrands(await apiListBrands());
  }, []);

  React.useEffect(() => {
    void Promise.resolve().then(refresh);
  }, [refresh]);
  React.useEffect(() => { apiGetMe().then(setUser); }, []);

  const refreshBalance = React.useCallback(async () => {
    try {
      const response = await fetch("/api/billing/status", { cache: "no-store" });
      if (response.ok) setBilling(await response.json());
    } catch {
      // Keep the last known balance when the status request is unavailable.
    }
  }, []);

  React.useEffect(() => {
    void Promise.resolve().then(refreshBalance);
  }, [refreshBalance]);
  React.useEffect(() => {
    const onChanged = () => refreshBalance();
    window.addEventListener("fluid:balance-changed", onChanged);
    return () => window.removeEventListener("fluid:balance-changed", onChanged);
  }, [refreshBalance]);

  // If the user arrived from a paid plan CTA on the marketing site, signup
  // stashed the tier — send them straight to Stripe checkout for it, once.
  React.useEffect(() => {
    let plan: string | null;
    try { plan = localStorage.getItem("fluid_intended_plan"); } catch { plan = null; }
    if (plan !== "starter" && plan !== "pro") return;
    try { localStorage.removeItem("fluid_intended_plan"); } catch { /* ignore */ }
    (async () => {
      try {
        const response = await fetch("/api/billing/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tier: plan }),
        });
        const result = await response.json().catch(() => ({}));
        if (response.ok && result.url) window.location.assign(result.url);
      } catch {
        // The user can subscribe from Settings → Billing instead.
      }
    })();
  }, []);

  const [noTokens, setNoTokens] = React.useState(false);
  React.useEffect(() => {
    const onNoTokens = () => setNoTokens(true);
    window.addEventListener("fluid:no-tokens", onNoTokens);
    return () => window.removeEventListener("fluid:no-tokens", onNoTokens);
  }, []);

  const value = { brands, user, billing, refreshBalance, refresh };
  return (
    <BrandDraftCtx.Provider value={value}>
      {children}
      {noTokens && <NoTokensBanner onClose={() => setNoTokens(false)} />}
    </BrandDraftCtx.Provider>
  );
}
