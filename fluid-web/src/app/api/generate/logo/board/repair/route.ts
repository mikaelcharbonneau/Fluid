import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { renderLogoImage } from "@/lib/ai/images";
import { streamActivity } from "@/lib/sse";
import type { Activity } from "@/lib/ai/activity";
import type { BoardSketch } from "@/lib/ai/sketch-board";

export const runtime = "nodejs";
export const maxDuration = 300;

function boardFrom(data: Record<string, unknown>): BoardSketch[] {
  return Array.isArray(data.logo_board)
    ? data.logo_board.filter((sketch): sketch is BoardSketch =>
        Boolean(
          sketch &&
            typeof sketch === "object" &&
            typeof (sketch as BoardSketch).id === "string" &&
            typeof (sketch as BoardSketch).art === "string",
        ),
      )
    : [];
}

// Re-renders a board as true transparent PNGs. This repair never spends another
// app token and is limited to a single transparent-only pass for each saved board.
const TRANSPARENT_OUTPUT_VERSION = "transparent-only-v2";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { brandId?: unknown };
  const brandId = typeof body.brandId === "string" ? body.brandId : "";
  if (!brandId) return NextResponse.json({ error: "Missing brandId." }, { status: 400 });

  const { data: brand, error: loadError } = await supabase
    .from("brands")
    .select("id, data")
    .eq("id", brandId)
    .maybeSingle();
  if (loadError) return NextResponse.json({ error: loadError.message }, { status: 500 });
  if (!brand) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const data = (brand.data as Record<string, unknown>) ?? {};
  const board = boardFrom(data);
  if (!board.length) return NextResponse.json({ error: "There are no concept images to repair." }, { status: 400 });
  if (data.logo_board_output_version === TRANSPARENT_OUTPUT_VERSION) {
    return NextResponse.json({ error: "This board does not need image repair." }, { status: 409 });
  }

  const repairKey = `${TRANSPARENT_OUTPUT_VERSION}:${board.map((sketch) => sketch.id).join(",")}`;
  if (data.logo_board_asset_repair_key === repairKey) {
    return NextResponse.json({ error: "This board's images have already been repaired." }, { status: 409 });
  }

  return streamActivity(async (activity: Activity) => {
    const stamp = Date.now().toString(36);
    activity.emit("note", `Repairing ${board.length} concept images`);
    const repaired = await Promise.all(
      board.map(async (sketch, index) => {
        const image = await renderLogoImage({
          brandId,
          phase: "board",
          slot: `repair-${stamp}-${index}`,
          prompt: sketch.art,
          quality: "medium",
          render: "pencil",
          background: "transparent",
          onPrompt: (prompt, model) =>
            activity.emit("prompt", `Repairing \"${sketch.name}\" (${model})`, prompt),
        });
        return { ...sketch, image_url: image.url };
      }),
    );

    const { error: saveError } = await supabase.rpc("brands_merge_data", {
      p_id: brandId,
      p_patch: {
        logo_board: repaired,
        logo_board_asset_repair_key: repairKey,
        logo_board_output_version: TRANSPARENT_OUTPUT_VERSION,
      },
    });
    if (saveError) throw new Error(`Could not save repaired images: ${saveError.message}`);

    activity.emit("note", `Repaired ${repaired.length} concept images`);
    return { board: repaired };
  }, {
    onError: (err) => ({
      message: err instanceof Error ? err.message : "Could not repair the concept images.",
    }),
  });
}
