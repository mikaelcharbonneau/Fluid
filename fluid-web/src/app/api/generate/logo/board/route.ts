import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { styleContext } from "@/lib/ai/step2";
import { getResearch } from "@/lib/ai/research";
import { generateCreativePlatform, getPlatform } from "@/lib/ai/platform";
import {
  generateSketchBoard,
  previewBoardPrompt,
  type BoardSketch,
} from "@/lib/ai/sketch-board";
import { pencilSketchPrompt, IMAGE_MODEL } from "@/lib/ai/images";
import { loadReferenceTaste } from "@/lib/ai/reference-taste";
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
  MAX_REFERENCE_LIKES,
  type LikedReference,
} from "@/lib/logo-board";
import { readCaption } from "@/lib/ai/caption-reference";
import { normalizeMarkTypes, normalizeStandaloneStyles } from "@/lib/logo-styles";

export const runtime = "nodejs";
export const maxDuration = 300;

// The references the client liked in Step 4, as design briefs.
//
// Order is the client's own like order, and it is load-bearing: planBoard deals
// references round-robin across the nine slots, so the first-liked reference
// gets the first slot. Preserving it makes the board reproducible from the
// client's point of view rather than shuffled by whatever order Postgres
// returns rows in.
//
// Uncaptioned references are dropped rather than passed empty. Every liked
// reference is promised a sketch, but a reference with no caption has nothing
// to say — it would claim a slot and brief it with silence.
async function loadLikedReferences(
  supabase: Awaited<ReturnType<typeof createClient>>,
  data: Record<string, unknown>,
): Promise<LikedReference[]> {
  const likedPaths = Array.isArray(data.logo_reference_likes)
    ? (data.logo_reference_likes as unknown[])
        .filter((x): x is string => typeof x === "string")
        .slice(0, MAX_REFERENCE_LIKES)
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
    const out: LikedReference[] = [];
    for (const imagePath of likedPaths) {
      const caption = readCaption(byPath.get(imagePath));
      if (caption) out.push({ imagePath, caption });
    }
    return out;
  } catch {
    // The gallery is an aid. Losing it costs the board its briefs, not its
    // existence.
    return [];
  }
}

// POST /api/generate/logo/board — the standalone logo flow's divergence step.
//
// One press draws a whole board: nine pencil croquis distributed across the
// (style world × mark type) pairings the client chose, never blended into
// hybrids. One design call writes all nine; nine renders run in parallel.
//
// Body: { brandId, config: { mark_types, standalone_styles, instructions },
//         reset?: boolean }
//
// Presses APPEND. A board grows until the client asks to start over, so a
// second press is nine more directions to compare against the first rather
// than a replacement for it.
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
    // The platform is part of the prompt, so a preview built without it would
    // not be the prompt. It is cached by /logo/research, which the client
    // already calls before drawing.
    const platform = getPlatform(data);
    if (!platform) {
      return NextResponse.json(
        {
          error:
            "No creative platform cached for this brand yet — call /api/generate/logo/research first. Previewing without it would show a prompt the studio would never actually send.",
        },
        { status: 409 },
      );
    }

    const [referenceTaste, likedReferences] = await Promise.all([
      loadReferenceTaste(supabase, data),
      loadLikedReferences(supabase, data),
    ]);
    const slots = planBoard(standaloneStyles, markTypes, likedReferences, BOARD_SIZE);
    const prior = reset ? [] : ((data.logo_board as BoardSketch[] | undefined) ?? []);

    const { system, user: userPrompt, model } = previewBoardPrompt({
      brandId,
      brief: String(brand.brief),
      name: brandName,
      platform,
      slots,
      styleContext: styleContext(brand, { omitPlatform: true }),
      instructions: instructions || null,
      nameMeaning:
        typeof data.logo_name_meaning === "string" ? data.logo_name_meaning : null,
      referenceTaste,
      avoidNames: prior.map((s) => s.name),
    });

    return NextResponse.json({
      preview: true,
      design: { model, system, user: userPrompt },
      // What each slot was briefed with, flattened so a mis-paired caption is
      // visible at a glance rather than buried in the prompt text.
      slots: slots.map((s) => ({
        index: s.index,
        style: s.style?.name ?? "Fluid's choice",
        markType: s.markType?.name ?? "Fluid's choice",
        reference: s.reference?.imagePath ?? null,
        device: s.reference?.caption.device ?? null,
      })),
      likes: {
        total: Array.isArray(data.logo_reference_likes) ? data.logo_reference_likes.length : 0,
        briefed: likedReferences.length,
      },
      axes: referenceTaste?.axes ?? [],
      // The image model receives the ART line of each concept wrapped in the
      // pencil prompt. ART only exists after a real design call, so the board
      // already drawn is the only place to see it — reconstructed here exactly
      // as renderLogoImage would build it.
      renders: prior.map((s) => ({
        slot: s.slot,
        name: s.name,
        model: IMAGE_MODEL,
        // Split, because only one of these two is worth iterating on. `art` is
        // what the designer wrote for this concept and is different every time;
        // the rest is a fixed rendering instruction identical across all nine.
        // Reading them merged makes the boilerplate look like output.
        art: s.art,
        prompt: pencilSketchPrompt(s.art),
      })),
      // The fixed wrapper, shown once with the ART slot marked, so it is
      // obvious how little of each render prompt is actually about the concept.
      renderTemplate: pencilSketchPrompt("{{ART}}"),
    });
  }

  // From here the run is long enough to be worth watching, so the response
  // becomes a stream of what it is doing and ends with the board.
  return streamActivity(async (activity: Activity) => {
    // Research is generated by /logo/research, which the client calls first.
    // It is an aid rather than a prerequisite, so a board is still drawn
    // without it — but it is never generated here, because nine renders need
    // every second of the budget this route has.
    const research = getResearch(data);
    // The board prompt states the creative platform itself, so styleContext
    // must not state it again. (Where it feeds generateCreativePlatform below,
    // there is no platform yet to omit.)
    const ctx = styleContext(brand, { omitPlatform: true });

    let platform = getPlatform(data);
    if (platform) {
      activity.emit("note", "Creative platform already cached — reusing it");
    } else {
      clock.guard("write the creative platform", 60_000);
      const done = activity.phase("Writing the creative platform");
      platform = await generateCreativePlatform({
        brief: String(brand.brief),
        name: brandName,
        audience: brand.audience as string | null,
        competitors: brand.competitors as string | null,
        styleContext: ctx,
      });
      done();
      activity.emit(
        "thinking",
        `Brand idea — ${platform.brand_idea}`,
        [
          `Brand idea: ${platform.brand_idea}`,
          platform.personality.length ? `Personality: ${platform.personality.join(", ")}` : "",
          platform.design_notes ? `Design notes: ${platform.design_notes}` : "",
        ].filter(Boolean).join("\n"),
      );
      clock.lap("platform");
    }

    const prior = reset ? [] : ((data.logo_board as BoardSketch[] | undefined) ?? []);
    const priorLikes = reset ? [] : ((data.logo_board_likes as string[] | undefined) ?? []);

    // Two readings of the same Step 4 picks, doing different jobs. The axes
    // tune HOW every mark is drawn; the captions brief WHAT thinking each
    // individual concept answers. They are complementary, not competing.
    const [referenceTaste, likedReferences] = await Promise.all([
      loadReferenceTaste(supabase, data),
      loadLikedReferences(supabase, data),
    ]);
    const slots = planBoard(standaloneStyles, markTypes, likedReferences, BOARD_SIZE);
    activity.emit(
      "note",
      `Board planned — ${slots.length} concepts across ${new Set(slots.map(slotStyleName)).size} style worlds`,
      slots
        .map((x) => `${x.index}. ${slotStyleName(x)} · ${slotTypeName(x)}`)
        .join("\n"),
    );

    clock.guard("draw the board", 200_000);
    const drawn = await generateSketchBoard({
      brandId,
      brief: String(brand.brief),
      name: brandName,
      platform,
      slots,
      styleContext: ctx,
      instructions: instructions || null,
      nameMeaning:
        typeof data.logo_name_meaning === "string" ? data.logo_name_meaning : null,
      referenceTaste,
      // Names already on the board, so a second press explores rather than
      // redraws what the client has already seen.
      avoidNames: prior.map((s) => s.name),
      clock,
      activity,
    });

    await spendTokens(user.id, TOKEN_COST.asset);

    const board = [...prior, ...drawn];
    const nextPatch = {
      creative_platform: platform,
      logo_board: board,
      logo_board_likes: priorLikes,
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
      platform,
      board,
      drawn: drawn.length,
      requested: slots.length,
      // How many of the client's likes actually briefed a concept. Below the
      // number they liked means some of their picks aren't captioned yet, and
      // the screen says so rather than quietly ignoring them.
      briefed: likedReferences.length,
      research,
    };
  }, {
    onError: (err) => ({
      message: err instanceof Error ? err.message : "Sketching the board failed.",
    }),
  });
}
