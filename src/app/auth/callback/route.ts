import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function getRequestOrigin(request: Request) {
  const url = new URL(request.url);
  const host = request.headers.get("host") ?? url.host;
  const protocol =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ??
    url.protocol.replace(":", "");

  return `${protocol}://${host}`;
}

function normalizeRedirectPath(redirectTo: string) {
  return redirectTo.startsWith("/") && !redirectTo.startsWith("//") ? redirectTo : "/";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const origin = getRequestOrigin(request);
  const code = searchParams.get("code");
  const redirectTo = normalizeRedirectPath(searchParams.get("redirectTo") ?? "/");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${redirectTo}`);
    }
  }

  return NextResponse.redirect(`${origin}/signin?error=auth`);
}
