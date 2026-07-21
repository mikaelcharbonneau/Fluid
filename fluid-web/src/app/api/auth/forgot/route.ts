import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/auth/forgot — send a password-reset email. Always responds ok so we
// never reveal whether an account exists for the address.
export async function POST(request: Request) {
  const { email } = await request.json().catch(() => ({}));
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Enter your email." }, { status: 400 });
  }

  const origin = new URL(request.url).origin;
  const supabase = await createClient();
  try {
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/api/auth/callback`,
    });
  } catch {
    /* swallow — do not leak whether the email exists */
  }

  return NextResponse.json({ ok: true });
}
