// A stable, one-way pseudonym for a Supabase user id — lets us correlate a
// user's error reports in Sentry without ever sending their email or the raw
// id. Uses Web Crypto so it works in both the Node and Edge runtimes.
export async function pseudonymousUserId(userId: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(userId));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
}
