// Real-time domain availability — Vercel's own Domains Registrar API, not a
// third-party service. Needs a personal or team Vercel Access Token
// (vercel.com/account/tokens), which is deliberately separate from anything
// Vercel injects automatically at build/deploy time (those never include a
// token with account-level scope).
//
// https://vercel.com/docs/domains/registrar-api

import { requireVercelAccessToken, serverEnv } from "@/lib/env/server";

const REGISTRAR_URL = "https://api.vercel.com/v1/registrar/domains/availability";
// The API accepts at most 50 per call; the name-suggestions step only ever
// shows 10, but this stays a hard ceiling regardless of caller.
const MAX_BATCH = 50;

export interface DomainAvailability {
  domain: string;
  /** `null` means the check itself failed for that domain — not the same as "taken". */
  available: boolean | null;
}

export async function checkDomainAvailability(domains: string[]): Promise<DomainAvailability[]> {
  const clean = [...new Set(domains.map((d) => d.trim().toLowerCase()).filter(Boolean))].slice(0, MAX_BATCH);
  if (clean.length === 0) return [];

  const teamId = serverEnv.VERCEL_TEAM_ID;
  const url = teamId ? `${REGISTRAR_URL}?teamId=${encodeURIComponent(teamId)}` : REGISTRAR_URL;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requireVercelAccessToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ domains: clean }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Domain availability check failed (${res.status}): ${detail.slice(0, 300)}`);
  }

  const json = (await res.json()) as { results?: Array<{ domain?: string; available?: boolean }> };
  const byDomain = new Map((json.results ?? []).map((r) => [r.domain, r.available] as const));
  return clean.map((domain) => ({ domain, available: byDomain.get(domain) ?? null }));
}
