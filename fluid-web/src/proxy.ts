import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/config";

// NOTE: In Next.js 16 "Middleware" was renamed to "Proxy" (same functionality,
// runs before a request completes). This file must live next to `app/` and be
// named proxy.ts. See node_modules/next/dist/docs/.../proxy.md.
//
// Responsibilities:
//   1. Refresh the Supabase auth session cookies on every matched request.
//   2. Gate /app behind a logged-in user.
//   3. Bounce already-authenticated users away from /login and /signup.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Do not run code between createServerClient and getUser() — it refreshes the
  // session token and is what keeps the user logged in across requests.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Redirect while carrying over any auth cookies getUser() refreshed onto
  // `response`. A bare NextResponse.redirect() would drop those Set-Cookie
  // headers, leaving the browser with a rotated (now-invalid) token.
  const redirectTo = (nextPath: string, hash?: string) => {
    const url = request.nextUrl.clone();
    url.pathname = nextPath;
    if (hash) url.hash = hash;
    const redirect = NextResponse.redirect(url);
    for (const cookie of response.cookies.getAll()) {
      redirect.cookies.set(cookie);
    }
    return redirect;
  };

  if (pathname.startsWith("/app") && !user) {
    return redirectTo("/login");
  }

  if ((pathname === "/login" || pathname === "/signup") && user) {
    return redirectTo("/app", "home");
  }

  return response;
}

export const config = {
  // Run on app pages and the auth pages, but skip static assets and the auth
  // API routes (those manage their own cookies via the response they return).
  matcher: [
    "/app/:path*",
    "/login",
    "/signup",
  ],
};
