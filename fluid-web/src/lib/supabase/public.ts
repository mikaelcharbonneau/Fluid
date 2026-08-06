import { createClient } from "@supabase/supabase-js";
import { SUPABASE_KEY, SUPABASE_URL } from "./config";

// A Supabase client bound to no request at all: no cookies, no session, no
// `next/headers` access. `unstable_cache` forbids reading request-scoped
// state (cookies/headers) inside the function it wraps, so the cookie-bound
// client from server.ts cannot be used there — this exists specifically for
// that case.
//
// Safe only for data a table's RLS policy already exposes to anyone, e.g.
// logo_references' `using (true)` select policy (see 0004b). Do not point
// this at a table that relies on the caller's identity for row visibility.
export function createPublicClient() {
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
