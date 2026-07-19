// Central place to resolve the Supabase connection values from the environment.
//
// The Supabase↔Vercel integration provisions NEXT_PUBLIC_SUPABASE_URL and
// NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. We also accept the older
// NEXT_PUBLIC_SUPABASE_ANON_KEY name so a hand-configured .env still works.
// Both the URL and the publishable/anon key are safe to expose to the browser;
// row-level security is what actually protects the data.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

export const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";

// Throw a clear, actionable error (instead of Supabase's generic one) if the
// app is deployed without these configured.
export function assertSupabaseEnv() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error(
      "Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and " +
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY).",
    );
  }
}
