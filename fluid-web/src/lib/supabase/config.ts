// Central place to resolve the Supabase connection values.
//
// Both values here are the PUBLIC Supabase project URL and publishable
// ("anon") key. They are designed to be exposed to the browser — they ship in
// the client bundle regardless — and row-level security is what actually
// protects data. The service-role / secret keys are NEVER referenced here.
//
// Environment variables take precedence (so a different project can be wired
// up without a code change); the literals are a fallback so the app also works
// on deploys where the NEXT_PUBLIC_* vars aren't propagated to the build
// (e.g. Preview builds when the vars are scoped to Production only).
const FALLBACK_URL = "https://jhxbylzfunojlfihlwhq.supabase.co";
const FALLBACK_PUBLISHABLE_KEY = "sb_publishable_il3ErgmDiE9YPg-3dWJDOQ_6tofR31q";

export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_URL;

export const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  FALLBACK_PUBLISHABLE_KEY;
