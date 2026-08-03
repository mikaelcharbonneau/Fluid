import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { styleContext, delegatedChoices } from "@/lib/ai/step2";
import { researchCategory, getResearch } from "@/lib/ai/research";
import { generateCreativePlatform, getPlatform } from "@/lib/ai/platform";
import { chosenBrandName } from "@/lib/brands";
import { startClock } from "@/lib/ai/budget";
import { streamActivity } from "@/lib/sse";
import type { Activity } from "@/lib/ai/activity";

export const runtime = "nodejs";
export const maxDuration = 300;

// POST /api/generate/logo/research — Phases -1 and 0 of the logo studio:
// agentic category research, then the creative platform built on top of it.
// Body: { brandId: string }.
//
// These used to run inside /sketches. Together with the design and render
// passes they blew past the 300s function ceiling, and a function killed at the
// ceiling can't return anything — the client saw a bodyless 504 and could only
// show a generic failure. Splitting them out puts each request comfortably
// inside the limit and lets the UI report which phase is running.
//
// Both results are cached on the brand, so this is a cheap no-op on reruns and
// on regenerating a board. It charges no tokens: the client pays for the
// sketch board that follows, and this may legitimately run more than once.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { brandId?: unknown };
  const brandId = typeof body.brandId === "string" ? body.brandId : "";
  if (!brandId) {
    return NextResponse.json({ error: "Missing brandId." }, { status: 400 });
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
      { error: "Add a brief before researching the category." },
      { status: 400 },
    );
  }

  const data = (brand.data as Record<string, unknown>) ?? {};
  const brandName = chosenBrandName(brand);

  // Nothing to do — let the client move straight on to sketching.
  const cachedResearch = getResearch(data);
  const cachedPlatform = getPlatform(data);
  if (cachedResearch && cachedPlatform) {
    return NextResponse.json({
      research: cachedResearch,
      platform: cachedPlatform,
      cached: true,
    });
  }

  // 240s of the route's 300s ceiling, leaving real headroom to send a response.
  // Research is capped well inside this so the platform pass always has room.
  const clock = startClock("logo/research", 240_000);
  const RESEARCH_BUDGET_MS = 120_000;

  return streamActivity(async (activity: Activity) => {
    // Research degrades gracefully: if search is unavailable or the model
    // returns unusable JSON, the studio still designs — just without category
    // grounding. Losing the run over a failed search is the worse outcome.
    let research = cachedResearch;
    if (research) {
      activity.emit("note", "Category research already cached — reusing it");
    } else {
      const done = activity.phase("Researching the category on the web");
      try {
        research = await researchCategory(
          {
            brief: String(brand.brief),
            name: brandName,
            audience: brand.audience as string | null,
            competitors: brand.competitors as string | null,
            delegated: delegatedChoices(brand),
          },
          RESEARCH_BUDGET_MS,
          activity,
        );
      } catch (err) {
        console.error("Category research failed; continuing without it:", err);
        activity.emit(
          "warn",
          "Research failed — designing without category grounding",
          err instanceof Error ? err.message : String(err),
        );
        research = null;
      }
      done();
      clock.lap("research");

      // Save research the moment it exists, BEFORE the platform pass. Research
      // is by far the most expensive step here, and the platform guard below
      // can throw — previously that threw away the finished research too, so
      // every retry re-ran (and re-paid for) the whole search from scratch and
      // never got any further. Persisting here is what makes a retry cheap.
      if (research) {
        const { error: cacheError } = await supabase.rpc("brands_merge_data", {
          p_id: brandId,
          p_patch: { research },
        });
        if (cacheError) {
          console.error("Failed to cache research:", cacheError.message);
        }
      }
    }

    // Research exists only in memory on a first run — it isn't on the brand
    // record until this request ends — so merge it in for styleContext().
    const ctx = styleContext(
      research ? { ...brand, data: { ...data, research } } : brand,
    );

    let platform = cachedPlatform;
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
          platform.territories?.length
            ? `Territories: ${platform.territories.map((t) => t.name).join(", ")}`
            : "",
        ].filter(Boolean).join("\n"),
      );
      clock.lap("platform");
    }

    const nextPatch = {
      ...(research ? { research } : {}),
      creative_platform: platform,
    };
    const { error: saveError } = await supabase.rpc("brands_merge_data", { p_id: brandId, p_patch: nextPatch });
    if (saveError) {
      // Not fatal — the client still gets the results for this run; they just
      // won't be cached, so the next run pays for them again.
      console.error("Failed to cache research/platform:", saveError.message);
    }

    return { research, platform };
  }, {
    onError: (err) => ({
      message: err instanceof Error ? err.message : "Category research failed.",
    }),
  });
}
