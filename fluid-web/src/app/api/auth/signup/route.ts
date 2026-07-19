import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const { name, email, password } = await request
    .json()
    .catch(() => ({}));

  if (!email || !password) {
    return NextResponse.json(
      { error: "Enter your email and a password." },
      { status: 400 },
    );
  }
  if (String(password).length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: name ?? "" } },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // New users are auto-confirmed (see the auto_confirm_new_users migration), so
  // signUp returns a session directly. If a project ever turns email
  // confirmation back on, fall back to a password sign-in and, failing that,
  // tell the client to show a "check your email" state.
  if (!data.session) {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) {
      return NextResponse.json({ ok: true, needsConfirm: true });
    }
  }

  return NextResponse.json({ ok: true });
}
