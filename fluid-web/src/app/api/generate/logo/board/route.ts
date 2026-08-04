import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  generateReferenceCroquisBoard,
  referenceCroquisPrompt,
} from "@/lib/ai/sketch-board";
import { IMAGE_MODEL } from "@/lib/ai/images";
import { hasTokens, spendTokens, TOKEN_COST } from "@/lib/credits";
import { chosenBrandName } from "@/lib/brands";
import { startClock } from "@/lib/ai/budget";
import { streamActivity } from "@/lib/sse";
import type { Activity } from "@/lib/ai/activity";
import {
  planBoard,
  slotStyleName,
  slotTypeName,
  BOARD_SIZE,
  type LikedReference,
} from "@/lib/logo-board";
import { captionReferenceImage, readCaption, visualPrinciples } from "@/lib/ai/caption-reference";
import { normalizeMarkTypes, normalizeStandaloneStyles } from "@/lib/logo-styles";
import { createAdminClient } from "@/lib/supabase/admin";
import { referenceImageUrl } from "@/lib/logo-reference-query";

export const runtime = "nodejs";
export const maxDuration = 300;

// The references the client liked in Step 4, as design briefs.
//
// Order is the client's own like order, and it is load-bearing: planBoard deals
// references round-robin across the six slots, so the first-liked reference
// gets the first slot. Preserving it makes the board reproducible from the
// client's point of view rather than shuffled by whatever order Postgres
// returns rows in.
//
// Every liked reference carries a detailed visual analysis. Older catalog rows
// are upgraded on demand so their first use also gets the direct prompt this
// flow promises, without requiring a blocking catalogue-wide backfill.
async function loadLikedReferences(
  supabase: Awaited<ReturnType<typeof createClient>>,
  data: Record<string, unknown>,
): Promise<LikedReference[]> {
  const likedPaths = Array.isArray(data.logo_reference_likes)
    ? (data.logo_reference_likes as unknown[])
        .filter((x): x is string => typeof x === "string")
    : [];
  if (!likedPaths.length) return [];

  try {
    const { data: rows } = await supabase
      .from("logo_references")
      .select("image_path, caption")
      .in("image_path", likedPaths);

    const byPath = new Map(
      ((rows ?? []) as { image_path: string; caption: unknown }[]).map((r) => [
        r.image_path,
        r.caption,
      ]),
    );
    return (await Promise.all(likedPaths.map(async (imagePath) => {
      let caption = readCaption(byPath.get(imagePath));
      if (!caption?.visual_principles) {
        const refreshed = await captionReferenceImage(referenceImageUrl(imagePath)).catch(() => null);
        if (refreshed) {
          caption = refreshed;
          try {
            await createAdminClient()
              .from("logo_references")
              .update({ caption: refreshed, updated_at: new Date().toISOString() })
              .eq("image_path", imagePath);
          } catch {
            // The current board still has the description; caching can retry on
            // a later board if the service client is unavailable.
          }
        }
      }
      return caption
        ? {
            imagePath,
            imageUrl: referenceImageUrl(imagePath),
            caption,
            visualPrinciples: visualPrinciples(caption),
          }
        : null;
    }))).filter((reference): reference is LikedReference => reference !== null);
  } catch {
    // The gallery is an aid. Losing it costs the board its briefs, not its
    // existence.
    return [];
  }
}

// POST /api/generate/logo/board — the standalone logo flow's divergence step.
//
// One press draws a six-concept board distributed across the
// (style world × mark type) pairings the client chose, never blended into
// hybrids. Each liked reference supplies one complete direct image prompt;
// the six renders run in parallel.
//
// Body: { brandId, config: { mark_types, standalone_styles, instructions },
//         reset?: boolean }
//
// Each press consumes the next ordered reference batch and replaces the board.
// Starting over resets the queue to the first six likes.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    brandId?: unknown;
    config?: unknown;
    reset?: unknown;
    preview?: unknown;
  };
  const brandId = typeof body.brandId === "string" ? body.brandId : "";
  if (!brandId) {
    return NextResponse.json({ error: "Missing brandId." }, { status: 400 });
  }
  const reset = body.reset === true;
  // Assemble the prompts and return them without calling anything. No tokens,
  // no renders, no writes.
  const preview = body.preview === true;

  const rawConfig = (body.config ?? {}) as Record<string, unknown>;
  const markTypes = normalizeMarkTypes(rawConfig.mark_types);
  const standaloneStyles = normalizeStandaloneStyles(rawConfig.standalone_styles);
  const instructions =
    typeof rawConfig.instructions === "string"
      ? rawConfig.instructions.trim().slice(0, 1000)
      : "";

  if (!markTypes.length) {
    return NextResponse.json(
      { error: "Choose a logo type before sketching concepts." },
      { status: 400 },
    );
  }

  const { data: brand, error: loadError } = await supabase
    .from("brands")
    .select("id, brief, audience, competitors, name, name_choice, style_id, data")
    .eq("id", brandId)
    .maybeSingle();

  if (loadError) {
    return NextResponse.json({ error: loadError.message }, { status: 500 });
  }
  if (!brand) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (!String(brand.brief ?? "").trim()) {
    return NextResponse.json(
      { error: "Add a brief before sketching logo concepts." },
      { status: 400 },
    );
  }

  // A preview spends nothing, so it must not be refused for having nothing to
  // spend — reading the prompts is exactly what you want to do while out of
  // tokens.
  //
  // The check itself is wrapped because a misconfigured server (a missing
  // service-role key, say) makes it throw, and an unhandled throw here is a
  // bare 500 with no body — which the client can only report as a generic
  // failure. Name the cause instead.
  if (!preview) {
    let affordable: boolean;
    try {
      affordable = await hasTokens(user.id, TOKEN_COST.asset);
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Could not check your token balance." },
        { status: 500 },
      );
    }
    if (!affordable) {
      return NextResponse.json(
        { error: "You're out of tokens. Top up in Settings → Billing.", code: "no_tokens" },
        { status: 402 },
      );
    }
  }

  const data = (brand.data as Record<string, unknown>) ?? {};
  const brandName = chosenBrandName(brand);
  const clock = startClock("logo/board", 280_000);

  if (preview) {
    const likedReferences = await loadLikedReferences(supabase, data);
    const savedOffset = Number(data.logo_reference_batch_offset);
    const batchOffset = reset || !Number.isInteger(savedOffset) || savedOffset < 0 ? 0 : savedOffset;
    const batch = likedReferences.slice(batchOffset, batchOffset + BOARD_SIZE);
    if (!batch.length) {
      return NextResponse.json({ error: "You've explored every liked reference." }, { status: 409 });
    }
    const slots = planBoard(standaloneStyles, markTypes, batch, BOARD_SIZE);
    return NextResponse.json({
      preview: true,
      slots: slots.map((s) => ({
        index: s.index,
        style: s.style?.name ?? "Fluid's choice",
        markType: s.markType?.name ?? "Fluid's choice",
        reference: s.reference?.imagePath ?? null,
      })),
      likes: {
        total: Array.isArray(data.logo_reference_likes) ? data.logo_reference_likes.length : 0,
        briefed: batch.length,
      },
      // These are the complete prompts sent to the image model. Each prompt
      // carries the visual principles for its own liked reference.
      renders: slots.map((s) => ({
        slot: s.index,
        model: IMAGE_MODEL,
        reference: s.reference?.imagePath ?? null,
        prompt: referenceCroquisPrompt({ brief: String(brand.brief), name: brandName }, s),
      })),
    });
  }

  // From here the run is long enough to be worth watching, so the response
  // becomes a stream of what it is doing and ends with the board.
  return streamActivity(async (activity: Activity) => {
    const likedReferences = await loadLikedReferences(supabase, data);
    const savedOffset = Number(data.logo_reference_batch_offset);
    const batchOffset = reset || !Number.isInteger(savedOffset) || savedOffset < 0 ? 0 : savedOffset;
    const batch = likedReferences.slice(batchOffset, batchOffset + BOARD_SIZE);
    if (!batch.length) {
      throw new Error("You've explored every liked reference. Return to the gallery to like more directions or start again from the first batch.");
    }
    const slots = planBoard(standaloneStyles, markTypes, batch, BOARD_SIZE);
    activity.emit(
      "note",
      `Board planned — ${slots.length} concepts across ${new Set(slots.map(slotStyleName)).size} style worlds`,
      slots
        .map((x) => `${x.index}. ${slotStyleName(x)} · ${slotTypeName(x)}`)
        .join("\n"),
    );

    clock.guard("render reference-led croquis", 200_000);
    const drawn = await generateReferenceCroquisBoard({
      brandId,
      brief: String(brand.brief),
      name: brandName,
      slots,
      clock,
      activity,
    });

    await spendTokens(user.id, TOKEN_COST.asset);

    const board = drawn;
    const nextPatch = {
      logo_board: board,
      logo_board_likes: [],
      logo_board_output_version: "native-transparent-v1",
      logo_reference_batch_offset: batchOffset + batch.length,
      logo_reference_batch_paths: batch.map((reference) => reference.imagePath),
      logo_board_config: {
        mark_types: markTypes,
        standalone_styles: standaloneStyles,
        instructions: instructions || null,
      },
    };
    const { error: saveError } = await supabase.rpc("brands_merge_data", { p_id: brandId, p_patch: nextPatch });
    if (saveError) {
      console.error("Failed to save the sketch board:", saveError.message);
      activity.emit("warn", `The board rendered but could not be saved: ${saveError.message}`);
    } else {
      activity.emit("note", `Saved — ${board.length} concepts on the board`);
    }

    return {
      board,
      drawn: drawn.length,
      requested: slots.length,
      briefed: batch.length,
      batchOffset,
      remaining: Math.max(0, likedReferences.length - batchOffset - batch.length),
    };
  }, {
    onError: (err) => ({
      message: err instanceof Error ? err.message : "Sketching the board failed.",
    }),
  });
}
