import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./config";

// Service-role Supabase client for server-side writes that have no user session
// (the Stripe webhook) or that must bypass RLS (storing a customer id). The
// service-role key is a SECRET — never import this into client code.
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export function createAdminClient() {
  if (!SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  }
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
