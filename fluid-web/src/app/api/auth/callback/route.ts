import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/config";

// GET /api/auth/callback — exchanges the `code` from a Supabase email link
// (password recovery, and later OAuth) for a session, then redirects on.
// The Supabase client is bound to the redirect response so the session
// Set-Cookie headers ride along with it (a bare redirect would drop them).
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  // Only allow same-site relative paths as the post-auth destination.
  const rawNext = url.searchParams.get("next") || "/reset-password";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/reset-password";

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=link", request.url));
  }

  const response = NextResponse.redirect(new URL(next, request.url));
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

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL("/login?error=expired", request.url));
  }
  return response;
}
