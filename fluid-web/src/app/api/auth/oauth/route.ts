import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/auth/oauth — begin an OAuth sign-in. Returns the provider's consent
// URL for the client to navigate to; the provider redirects back to
// /api/auth/callback, which exchanges the code for a session.
export async function POST(request: Request) {
  const { provider } = await request.json().catch(() => ({}));
  if (provider !== "google" && provider !== "apple") {
    return NextResponse.json({ error: "Unsupported provider." }, { status: 400 });
  }

  const origin = new URL(request.url).origin;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${origin}/api/auth/callback?next=/app` },
  });

  if (error || !data?.url) {
    return NextResponse.json(
      { error: `Sign-in with ${provider} isn't available yet.` },
      { status: 502 },
    );
  }

  return NextResponse.json({ url: data.url });
}
