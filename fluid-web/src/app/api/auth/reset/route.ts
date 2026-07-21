import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/auth/reset — set a new password. Requires the recovery session
// established by the email link (via /api/auth/callback).
export async function POST(request: Request) {
  const { password } = await request.json().catch(() => ({}));
  if (!password || typeof password !== "string" || password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Your reset link has expired. Request a new one." },
      { status: 401 },
    );
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return NextResponse.json(
      { error: "Couldn't update the password. Try a different one." },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
