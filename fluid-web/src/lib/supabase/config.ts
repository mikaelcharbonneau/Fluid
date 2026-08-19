import { publicEnv } from "@/lib/env/public";

// Central place to resolve the Supabase connection values. Both are the
// PUBLIC Supabase project URL and publishable ("anon") key — they ship in
// the client bundle regardless, and row-level security is what actually
// protects data. The service-role / secret key is never referenced here.
// See src/lib/env/public.ts for validation and the fallback values.
export const SUPABASE_URL = publicEnv.SUPABASE_URL;
export const SUPABASE_KEY = publicEnv.SUPABASE_KEY;
