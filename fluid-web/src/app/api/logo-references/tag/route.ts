import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { tagReferenceImage } from "@/lib/ai/tag-reference";
import { captionReferenceImage } from "@/lib/ai/caption-reference";
import { referenceImageUrl } from "@/lib/logo-reference-query";
import { aspectRatioFrom } from "@/lib/image-size";

export const runtime = "nodejs";
// Long, because a backfill is measured in hundreds of images and the point of
// this route is that it finishes without being nursed. Vercel clamps this to
// whatever the plan actually allows, so asking for more than the account can
// give is harmless.
export const maxDuration = 800;

const DEFAULT_BATCH = 25;
const MAX_BATCH = 250;

// Images in flight at once. Captioning is almost entirely spent waiting on the
// vision API, so running one at a time left the function idle for ~99% of its
// life and made a 250-row library a fourteen-press chore.
//
// Six rather than more: the ceiling here is the account's per-minute token
// budget, not anything local, and overshooting it converts a fast batch into a
// slow one full of 429s.
const CONCURRENCY = 6;

// Stop starting new work with this much of the budget left. Whatever is already
// in flight then has time to finish and be written, so the response reports real
// numbers and the queue picks up cleanly next press — rather than the platform
// killing the function mid-write and losing the lot.
const DEADLINE_MARGIN_MS = 45_000;

// Run `worker` over `items`, CONCURRENCY at a time, stopping early when the
// clock runs out. Results come back in completion order; the caller sorts if it
// cares. Anything not started is simply left in the queue.
async function runPool<T, R>(
  items: T[],
  deadline: number,
  worker: (item: T) => Promise<R>,
): Promise<{ results: R[]; ranOut: boolean }> {
  const results: R[] = [];
  let next = 0;
  let ranOut = false;

  async function lane() {
    for (;;) {
      if (Date.now() > deadline) { ranOut = true; return; }
      const i = next++;
      if (i >= items.length) return;
      results.push(await worker(items[i]));
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, items.length) }, lane),
  );
  return { results, ranOut };
}

// POST /api/logo-references/tag — catalogue the reference library.
//
// Two modes:
//   "new"     (default) images in the storage bucket with no row yet. Tags and
//             captions them in one pass, so anything added from here on
//             arrives complete.
//   "caption" rows that predate captioning. Backfill only — attributes and
//             refinement are left exactly as they are.
//
// Body: { mode?: "new" | "caption", limit?: number, dryRun?: boolean, prefix?: string }
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
    mode?: unknown; limit?: unknown; dryRun?: unknown; prefix?: unknown;
  };
  const mode = body.mode === "caption" ? "caption" : "new";
  const requested = Number(body.limit);
  const limit = Math.min(
    Math.max(Number.isFinite(requested) && requested > 0 ? requested : DEFAULT_BATCH, 1),
    MAX_BATCH,
  );
  const dryRun = body.dryRun === true;
  const prefix = typeof body.prefix === "string" ? body.prefix : "";

  const admin = createAdminClient();
  const deadline = Date.now() + maxDuration * 1000 - DEADLINE_MARGIN_MS;

  return mode === "caption"
    ? captionExisting(admin, { limit, dryRun, prefix, deadline })
    : tagNew(admin, { limit, dryRun, prefix, deadline });
}

type Admin = ReturnType<typeof createAdminClient>;
interface BatchOptions {
  limit: number;
  dryRun: boolean;
  prefix: string;
  deadline: number;
}

// Is the bucket object actually there? HEAD, so a large image costs nothing to
// check. A network failure answers "yes" deliberately: the caption call that
// follows will fail too, and a transient blip must not be mistaken for a
// deleted file and cost the row its is_active flag.
async function objectExists(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD" });
    return res.status !== 404 && res.status !== 400;
  } catch {
    return true;
  }
}

// Mode "new" — bucket objects with no row yet. Tagged AND captioned in one
// pass so nothing added from here on needs a backfill later.
async function tagNew(
  admin: Admin,
  { limit, dryRun, prefix, deadline }: BatchOptions,
) {
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
    return NextResponse.json({ mode: "new", tagged: 0, failed: 0, remaining: 0, results: [] });
  }

  type TagResult = {
    path: string; ok: boolean; name?: string; markType?: string;
    device?: string | null; reason?: string;
  };

  const { results, ranOut } = await runPool<string, TagResult>(
    paths,
    deadline,
    async (path): Promise<TagResult> => {
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
      if (!tagged) return { path, ok: false, reason: "unusable tag response" };

      // A failed caption doesn't sink the row — it lands in the backfill queue
      // like any pre-caption row, and the mark still works in the gallery.
      const caption = await captionReferenceImage(url).catch(() => null);

      if (!dryRun) {
        const { error } = await admin.from("logo_references").insert({
          name: tagged.name,
          mark_type: tagged.markType,
          image_path: path,
          attributes: tagged.attributes,
          industry: tagged.industry,
          aspect_ratio: aspectRatio,
          // Absent when the model's reading was incomplete — left null rather
          // than half-filled, so it shows up as untagged instead of as a
          // confident "quiet, calm, cool, simple".
          refinement: tagged.refinement,
          caption,
          notes: "auto-catalogued",
          is_active: true,
          sort_order: 0,
        });
        if (error) return { path, ok: false, reason: error.message };
      }
      return {
        path, ok: true, name: tagged.name, markType: tagged.markType,
        device: caption?.device ?? null,
      };
    } catch (err) {
      return {
        path,
        ok: false,
        reason: err instanceof Error ? err.message.slice(0, 140) : "failed",
      };
    }
  });

  const { data: left } = await admin.rpc("logo_references_untagged_count", { p_prefix: prefix });

  return NextResponse.json({
    mode: "new",
    dryRun,
    tagged: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    remaining: typeof left === "number" ? left : null,
    // True when the clock, not the queue, ended the run — so "remaining > 0"
    // can be read as "press again" rather than "something is stuck".
    stoppedOnTime: ranOut,
    results,
  });
}

// Mode "caption" — backfill rows that predate captioning. Touches only the
// caption column; attributes, refinement and everything hand-corrected stay.
async function captionExisting(
  admin: Admin,
  { limit, dryRun, prefix, deadline }: BatchOptions,
) {
  let query = admin
    .from("logo_references")
    .select("image_path")
    .is("caption", null)
    .eq("is_active", true)
    .order("sort_order")
    .limit(limit);
  if (prefix) query = query.like("image_path", `${prefix}%`);

  const { data: pending, error: pendingError } = await query;
  if (pendingError) {
    return NextResponse.json({ error: pendingError.message }, { status: 500 });
  }

  const paths = ((pending ?? []) as { image_path: string }[]).map((r) => r.image_path);
  if (!paths.length) {
    return NextResponse.json({ mode: "caption", captioned: 0, failed: 0, remaining: 0, results: [] });
  }

  type CaptionResult = {
    path: string; ok: boolean; device?: string | null;
    technique?: string; concept?: string | null; reason?: string;
  };

  // Each row is written the moment its caption lands, not batched at the end.
  // A run that dies partway then keeps everything it finished, and the queue
  // simply serves the rest next time.
  const { results, ranOut } = await runPool<string, CaptionResult>(
    paths,
    deadline,
    async (path): Promise<CaptionResult> => {
    try {
      const url = referenceImageUrl(path);

      // Check the object is actually there before spending a vision call on
      // it. A row whose file has been renamed or deleted would otherwise fail
      // every batch forever: the queue is "caption is null ORDER BY
      // sort_order", so the same dead rows return to the front of every run and
      // the backfill never drains past them.
      //
      // Such a row is also a broken image in the Step 4 gallery, which filters
      // on is_active alone — so it is deactivated here rather than merely
      // skipped. Reversible, and `notes` records why, so re-uploading the file
      // and flipping is_active back is a two-line fix.
      if (!(await objectExists(url))) {
        if (!dryRun) {
          await admin
            .from("logo_references")
            .update({
              is_active: false,
              notes: `deactivated ${new Date().toISOString().slice(0, 10)}: image missing from storage`,
              updated_at: new Date().toISOString(),
            })
            .eq("image_path", path);
        }
        return { path, ok: false, reason: "image missing from storage — row deactivated" };
      }

      const caption = await captionReferenceImage(url);
      if (!caption) {
        return { path, ok: false, reason: "unusable caption response" };
      }
      if (!dryRun) {
        const { error } = await admin
          .from("logo_references")
          .update({ caption, updated_at: new Date().toISOString() })
          .eq("image_path", path);
        if (error) return { path, ok: false, reason: error.message };
      }
      // The full caption comes back on every row, because the only way to know
      // whether a batch held its altitude is to read it.
      return {
        path, ok: true,
        technique: caption.technique,
        device: caption.device,
        concept: caption.concept,
      };
    } catch (err) {
      return {
        path,
        ok: false,
        reason: err instanceof Error ? err.message.slice(0, 140) : "failed",
      };
    }
  });

  let remainingQuery = admin
    .from("logo_references")
    .select("image_path", { count: "exact", head: true })
    .is("caption", null)
    .eq("is_active", true);
  if (prefix) remainingQuery = remainingQuery.like("image_path", `${prefix}%`);
  const { count } = await remainingQuery;

  return NextResponse.json({
    mode: "caption",
    dryRun,
    captioned: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    // A dry run changes nothing, so the queue is unchanged too — say the
    // number that will still be waiting rather than implying progress.
    remaining: typeof count === "number" ? count : null,
    // True when the clock, not the queue, ended the run — so "remaining > 0"
    // can be read as "press again" rather than "something is stuck".
    stoppedOnTime: ranOut,
    results,
  });
}
