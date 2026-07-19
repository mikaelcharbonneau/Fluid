import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/config";

// POST-only: signing out mutates auth state, so it must not run on a GET —
// a cross-site top-level navigation to a GET logout could drop the session
// without the user's intent. The in-app "Log out" control submits a POST form.
//
// The Supabase client is bound directly to the redirect response so the
// session-clearing Set-Cookie headers ride along with the 303 (a separate
// NextResponse.redirect() would drop them).
export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/login", request.url), 303);

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  await supabase.auth.signOut();
  return response;
}
