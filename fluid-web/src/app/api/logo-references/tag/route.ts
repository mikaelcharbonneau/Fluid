import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { tagReferenceImage } from "@/lib/ai/tag-reference";
import { referenceImageUrl } from "@/lib/logo-reference-query";
import { aspectRatioFrom } from "@/lib/image-size";

export const runtime = "nodejs";
export const maxDuration = 300;

const DEFAULT_BATCH = 10;
const MAX_BATCH = 40;

// POST /api/logo-references/tag — catalogue images that are in the storage
// bucket but have no row yet.
//
// Body: { limit?: number, dryRun?: boolean, prefix?: string }
// Header: x-tagging-secret must match LOGO_TAGGING_SECRET.
//
// Gated on a shared secret as well as a session. Any signed-in user could
// otherwise rewrite the catalogue every account depends on, and burn model
// spend doing it — this is a maintenance tool, not a product surface.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const secret = (process.env.LOGO_TAGGING_SECRET ?? "").trim();
  if (!secret) {
    return NextResponse.json(
      { error: "Tagging is not configured." },
      { status: 503 },
    );
  }
  if ((request.headers.get("x-tagging-secret") ?? "").trim() !== secret) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    limit?: unknown; dryRun?: unknown; prefix?: unknown;
  };
  const requested = Number(body.limit);
  const limit = Math.min(
    Math.max(Number.isFinite(requested) && requested > 0 ? requested : DEFAULT_BATCH, 1),
    MAX_BATCH,
  );
  const dryRun = body.dryRun === true;
  const prefix = typeof body.prefix === "string" ? body.prefix : "";

  const admin = createAdminClient();

  // Which bucket objects have no row yet. Done in SQL rather than by listing
  // the bucket so it stays a single query as the library grows.
  const { data: pending, error: pendingError } = await admin.rpc(
    "logo_references_untagged",
    { p_prefix: prefix, p_limit: limit },
  );
  if (pendingError) {
    return NextResponse.json({ error: pendingError.message }, { status: 500 });
  }

  const paths = ((pending ?? []) as { image_path: string }[]).map((r) => r.image_path);
  if (!paths.length) {
    return NextResponse.json({ tagged: 0, failed: 0, remaining: 0, results: [] });
  }

  const results: { path: string; ok: boolean; name?: string; markType?: string; reason?: string }[] = [];

  for (const path of paths) {
    const url = referenceImageUrl(path);
    try {
      // Fetch once: the bytes give us the aspect ratio the masonry needs, and
      // a 404 here is worth reporting rather than discovering mid-generation.
      let aspectRatio: number | null = null;
      try {
        const res = await fetch(url);
        if (res.ok) aspectRatio = aspectRatioFrom(Buffer.from(await res.arrayBuffer()));
      } catch { /* dimensions are a nicety; tagging still stands */ }

      const tagged = await tagReferenceImage(url);
      if (!tagged) {
        results.push({ path, ok: false, reason: "unusable response" });
        continue;
      }

      if (!dryRun) {
        const { error } = await admin.from("logo_references").insert({
          name: tagged.name,
          mark_type: tagged.markType,
          image_path: path,
          attributes: tagged.attributes,
          industry: tagged.industry,
          aspect_ratio: aspectRatio,
          notes: "auto-catalogued",
          is_active: true,
          sort_order: 0,
        });
        if (error) {
          results.push({ path, ok: false, reason: error.message });
          continue;
        }
      }
      results.push({ path, ok: true, name: tagged.name, markType: tagged.markType });
    } catch (err) {
      results.push({
        path,
        ok: false,
        reason: err instanceof Error ? err.message.slice(0, 140) : "failed",
      });
    }
  }

  const { data: left } = await admin.rpc("logo_references_untagged_count", { p_prefix: prefix });

  return NextResponse.json({
    dryRun,
    tagged: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    remaining: typeof left === "number" ? left : null,
    results,
  });
}
