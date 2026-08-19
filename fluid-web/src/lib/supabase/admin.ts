import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./config";
import { requireSupabaseServiceRoleKey } from "@/lib/env/server";

// Service-role Supabase client for server-side writes that have no user session
// (the Stripe webhook) or that must bypass RLS (storing a customer id). The
// service-role key is a SECRET — never import this into client code.
export function createAdminClient() {
  return createClient(SUPABASE_URL, requireSupabaseServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
