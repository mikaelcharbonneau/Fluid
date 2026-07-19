import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/me — the signed-in user's display identity, for the app shell.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const name = String(meta.full_name ?? "").trim();
  const email = user.email ?? "";
  const initialSource = name || email || "?";
  const initial = initialSource.trim().charAt(0).toUpperCase();

  return NextResponse.json({
    id: user.id,
    email,
    name,
    initial,
  });
}
