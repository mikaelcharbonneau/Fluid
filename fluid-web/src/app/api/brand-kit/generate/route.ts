import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { streamActivity } from "@/lib/sse";
import { hasTokens, spendTokens, TOKEN_COST } from "@/lib/credits";
import { generateBrandKit } from "@/lib/brand-kit/generate";
import { LAYOUTS, VISUAL_MODES, type BrandKitBrief, type BrandKitLayout, type VisualMode } from "@/lib/brand-kit/types";
import type { Activity } from "@/lib/ai/activity";

export const runtime = "nodejs";
export const maxDuration = 300;

const LAYOUT_IDS = new Set(LAYOUTS.map((l) => l.id));
const VISUAL_MODE_IDS = new Set(VISUAL_MODES.map((m) => m.id));

interface RequestBody {
  brandId?: unknown;
  name?: unknown;
  brief?: unknown;
  category?: unknown;
  audience?: unknown;
  visualMode?: unknown;
  layout?: unknown;
  avoid?: unknown;
}

// POST /api/brand-kit/generate — one shot: name + brief in, one composite
// brand-kit board image out. Replaces the old /api/brand-chat/{turn,assist}.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as RequestBody;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const brief = typeof body.brief === "string" ? body.brief.trim() : "";
  const brandId = typeof body.brandId === "string" ? body.brandId : "";
  if (!name) {
    return NextResponse.json({ error: "Give the brand a name." }, { status: 400 });
  }
  if (!brief) {
    return NextResponse.json({ error: "A short brief is required." }, { status: 400 });
  }

  const category = typeof body.category === "string" ? body.category.trim() : undefined;
  const audience = typeof body.audience === "string" ? body.audience.trim() : undefined;
  const layoutRaw = typeof body.layout === "string" ? body.layout : "";
  const layout: BrandKitLayout = LAYOUT_IDS.has(layoutRaw as BrandKitLayout)
    ? (layoutRaw as BrandKitLayout)
    : "3x3";
  const visualModeRaw = typeof body.visualMode === "string" ? body.visualMode : "";
  const visualMode: VisualMode | undefined = VISUAL_MODE_IDS.has(visualModeRaw as VisualMode)
    ? (visualModeRaw as VisualMode)
    : undefined;
  const avoid = Array.isArray(body.avoid)
    ? body.avoid.filter((a): a is string => typeof a === "string" && a.trim().length > 0)
    : undefined;

  // Create or claim the row before doing any paid work — same ordering
  // reasoning the old flow used: the record has to exist and belong to this
  // user before we start spending on it.
  let id = brandId;
  if (id) {
    const { data: existing, error: loadError } = await supabase
      .from("brands")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    if (loadError) {
      return NextResponse.json({ error: loadError.message }, { status: 500 });
    }
    if (!existing) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    const { error: updateError } = await supabase
      .from("brands")
      .update({ name, brief, audience: audience ?? "" })
      .eq("id", id);
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
  } else {
    const { data: created, error: createError } = await supabase
      .from("brands")
      .insert({ name, brief, audience: audience ?? "", status: "draft", user_id: user.id })
      .select("id")
      .single();
    if (createError || !created) {
      return NextResponse.json(
        { error: createError?.message ?? "Could not start a new brand." },
        { status: 500 },
      );
    }
    id = created.id;
  }

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

  const briefInput: BrandKitBrief = { name, brief, category, audience, visualMode, layout, avoid };
  const finalId = id;

  return streamActivity(
    async (activity: Activity) => {
      const result = await generateBrandKit({ brandId: finalId, brief: briefInput, activity });
      await spendTokens(user.id, TOKEN_COST.asset);

      const { error: saveError } = await supabase.rpc("brands_merge_data", {
        p_id: finalId,
        p_patch: {
          brandkit: result,
          palette: { colors: result.strategy.palette },
        },
      });
      if (saveError) {
        // The image is rendered and paid for either way; only the cache
        // failed, so this warns rather than throwing the run away.
        activity.emit("warn", "The board was drawn but could not be saved for next time.", saveError.message);
      } else {
        await supabase.from("brands").update({ status: "live" }).eq("id", finalId);
      }

      return { done: true, brandId: finalId, brandkit: result };
    },
    {
      onError: (err) => ({
        message: err instanceof Error ? err.message : "The board could not be generated.",
      }),
    },
  );
}
