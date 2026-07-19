import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Supabase client bound to the current request's cookies. Use inside route
// handlers and server components. The URL and publishable ("anon") key are
// safe to expose to the browser — row-level security is what protects data.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // In a Server Component the cookie store is read-only; the try/catch
          // lets those renders no-op. Session refresh happens in proxy.ts.
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            /* called from a Server Component — safe to ignore */
          }
        },
      },
    },
  );
}
