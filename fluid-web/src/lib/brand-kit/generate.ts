// Orchestrates one brand-kit run: strategy read -> prompt -> one render.
//
// Deliberately no quality-critique redraw loop (unlike the old single-logo
// pipeline) — this skill is a single-shot deliverable by design. The
// transient-error retry inside renderLogoImage (429/500/etc.) still applies.

import { renderLogoImage, IMAGE_MODEL, type ImageSize } from "@/lib/ai/images";
import type { Activity } from "@/lib/ai/activity";
import { generateBrandKitStrategy } from "./strategy";
import { buildBrandKitPrompt } from "./prompt";
import type { BrandKitBrief, BrandKitLayout, BrandKitResult } from "./types";

const RENDER_QUALITY = "high" as const;
const RENDER_TIMEOUT_MS = 150_000;

function sizeForLayout(layout: BrandKitLayout): ImageSize {
  return layout === "2x2" ? "1024x1024" : "1536x1024";
}

export async function generateBrandKit(opts: {
  brandId: string;
  brief: BrandKitBrief;
  activity: Activity;
}): Promise<BrandKitResult> {
  const { brandId, brief, activity } = opts;
  const layout = brief.layout ?? "3x3";

  const strategy = await generateBrandKitStrategy(brief, activity);
  activity.emit("thinking", `Strategy: ${strategy.logoIdea}`, JSON.stringify(strategy, null, 2));

  const prompt = buildBrandKitPrompt(brief, strategy);
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
