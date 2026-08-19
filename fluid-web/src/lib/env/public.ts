import { parseEnv } from "./parse";
import { PublicEnvSchema } from "./schema";

// Config that's safe to expose to the browser — the values themselves, not
// just their presence. Import this from client OR server code.
//
// Next only inlines `process.env.NEXT_PUBLIC_*` when the reference is
// statically analyzable, so the literal reads have to stay right here rather
// than being built from a loop over schema.ts's manifest.
const raw = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  NEXT_PUBLIC_SENTRY_ENVIRONMENT: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
  NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
};

const parsed = parseEnv("public", PublicEnvSchema, raw);

// Supabase's project URL and publishable ("anon") key are designed to ship
// in the client bundle — RLS is what actually protects data — so these
// fallbacks (not secrets) keep the app working on deploys where the
// NEXT_PUBLIC_* vars aren't propagated to the build (e.g. Preview builds
// scoped to Production-only env vars).
const FALLBACK_SUPABASE_URL = "https://jhxbylzfunojlfihlwhq.supabase.co";
const FALLBACK_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_il3ErgmDiE9YPg-3dWJDOQ_6tofR31q";

export const publicEnv = {
  SUPABASE_URL: parsed.NEXT_PUBLIC_SUPABASE_URL ?? FALLBACK_SUPABASE_URL,
  SUPABASE_KEY:
    parsed.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    parsed.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    parsed.SUPABASE_ANON_KEY ??
    FALLBACK_SUPABASE_PUBLISHABLE_KEY,
  SENTRY_DSN: parsed.NEXT_PUBLIC_SENTRY_DSN,
  SENTRY_ENVIRONMENT: parsed.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
  VERCEL_GIT_COMMIT_SHA: parsed.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
} as const;
