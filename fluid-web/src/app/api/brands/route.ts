import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sanitizeBrandInput } from "@/lib/brands";

// GET /api/brands — list the signed-in user's brands (newest first).
// RLS restricts rows to the owner; we still fail closed if there's no session.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("brands")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ brands: data });
}

// POST /api/brands — create a new draft for the signed-in user.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const input = sanitizeBrandInput(await request.json().catch(() => ({})));

  const { data, error } = await supabase
    .from("brands")
    .insert({ ...input, user_id: user.id })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ brand: data }, { status: 201 });
}
