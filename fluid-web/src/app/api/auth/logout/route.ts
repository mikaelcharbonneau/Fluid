import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
}

// GET so the in-app "Log out" link can be a plain <a href> that navigates.
export async function GET(request: Request) {
  await signOut();
  return NextResponse.redirect(new URL("/login", request.url));
}

// POST for programmatic sign-out (e.g. fetch from a button).
export async function POST() {
  await signOut();
  return NextResponse.json({ ok: true });
}
