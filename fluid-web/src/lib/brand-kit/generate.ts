// Renders the board from an already-confirmed strategy.
//
// The strategy itself is no longer generated here — it's built one field at
// a time during the stepper (see draft.ts), with the user confirming or
// editing each field along the way. By the time this runs, `strategy` is
// exactly what the user signed off on at the `review` step.
//
// The board render is anchored to the logo concept the user picked:
// `strategy.logoImageUrl` gets fetched back and passed as `referenceImage`,
// which switches the OpenAI call to edit-mode (source-locked to that mark)
// instead of a fresh generation — the same pattern the old refine pipeline
// used to keep a chosen sketch's exact linework through later renders (see
// `src/lib/ai/refine.ts`). Without this the board render only ever saw the
// logo as a text description and could reinvent it.
//
// Deliberately no quality-critique redraw loop (unlike the old single-logo
// pipeline) — this skill is a single-shot deliverable by design. The
// transient-error retry inside renderLogoImage (429/500/etc.) still applies.

import { fetchImageBytes, renderLogoImage, IMAGE_MODEL, type ImageSize } from "@/lib/ai/images";
import type { Activity } from "@/lib/ai/activity";
import { buildBrandKitPrompt } from "./prompt";
import type { BrandKitBrief, BrandKitLayout, BrandKitResult, BrandKitStrategy } from "./types";

const RENDER_QUALITY = "high" as const;
const RENDER_TIMEOUT_MS = 150_000;

function sizeForLayout(layout: BrandKitLayout): ImageSize {
  return layout === "2x2" ? "1024x1024" : "1536x1024";
}

export async function generateBrandKit(opts: {
  brandId: string;
  brief: BrandKitBrief;
  strategy: BrandKitStrategy;
  activity: Activity;
}): Promise<BrandKitResult> {
  const { brandId, brief, strategy, activity } = opts;
  const layout = brief.layout ?? "3x3";

  const prompt = buildBrandKitPrompt(brief, strategy);

  let referenceImage: Buffer | undefined;
  try {
    referenceImage = await fetchImageBytes(strategy.logoImageUrl);
  } catch (err) {
    // The picked concept's image should always be fetchable (we stored it
    // ourselves); if it isn't, ship the board from the text description
    // rather than failing the whole run over a missing reference.
    activity.emit("warn", "Could not load the chosen logo as a reference — drawing from its description instead.", err instanceof Error ? err.message : undefined);
  }

  activity.emit("note", `Drawing the board with ${IMAGE_MODEL} (high quality)`);

  let sentPrompt = prompt;
  let sentModel = IMAGE_MODEL;

  const image = await renderLogoImage({
    brandId,
    phase: "brandkit",
    slot: "board",
    prompt,
    quality: RENDER_QUALITY,
    timeoutMs: RENDER_TIMEOUT_MS,
    size: sizeForLayout(layout),
    referenceImage,
    onPrompt: (sent, model) => {
      sentPrompt = sent;
      sentModel = model;
      activity.emit("prompt", `Prompt for the board (${model})`, sent);
    },
  });

  activity.emit("note", `Board drawn (${sentPrompt.length} char prompt)`);

  return {
    imageUrl: image.url,
    imagePrompt: sentPrompt,
    imageModel: sentModel,
    layout,
    strategy,
    generatedAt: new Date().toISOString(),
  };
}
