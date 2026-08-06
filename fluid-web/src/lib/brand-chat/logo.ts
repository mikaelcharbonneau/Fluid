// Drawing the marks from a skill-native visual identity brief.
//
// Pipeline (mirrors the offline test that worked well):
//   1. brand-identity skill → full markdown visual identity brief
//   2. OpenAI image model → logo variations, each given the entire brief
//
// The brief is the product artifact; the images are executions of it.

import { renderLogoImage } from "@/lib/ai/images";
import type { Activity } from "@/lib/ai/activity";
import { silentActivity } from "@/lib/ai/activity";
import { logoFromVisualIdentityBrief } from "./logo-prompt";
import {
  extractPaletteFromBrief,
  extractStrategyFromBrief,
  generateVisualIdentityBrief,
} from "./identity-brief";
import type { BrandContext } from "./context";

export interface LogoMark {
  /** Index in the set, and the storage slot. */
  slot: number;
  /** The approach, from the brief — shown under the card. */
  label: string;
  /** The art direction it was drawn from (brief excerpt / variation note). */
  art: string;
  /** Public URL of the rendered PNG, or null if this one failed. */
  image_url: string | null;
  /** Why it is missing, when it is. */
  error?: string;
}

export interface LogoSet {
  /** Short strategy summary for the UI card. */
  concept: string;
  /** Full skill-native visual identity brief (markdown). */
  visualIdentityBrief: string;
  palette: Array<{ hex: string; role: string }>;
  marks: LogoMark[];
  /** Identifies the inputs these were drawn for; see `logoInputsKey`. */
  key: string;
}

/** How many logo options to draw. Parallel wall-clock, not sequential. */
const VARIATION_COUNT = 4;

/** Time for one image. All run together, so this is wall clock, not a sum. */
const RENDER_TIMEOUT_MS = 110_000;

/**
 * The answers a set of marks depends on.
 *
 * Re-entering the step should show the marks already paid for, not spend more
 * renders drawing them again — but only while the brief behind them is
 * unchanged. Change the name, the mark type, the direction or the refusals and
 * the old set is answering a question nobody is asking any more.
 */
export function logoInputsKey(ctx: BrandContext): string {
  return JSON.stringify([
    ctx.name ?? "",
    ctx.logoType ?? "wordmark",
    ctx.direction ?? "",
    [...(ctx.avoid ?? [])].sort(),
  ]);
}

export async function generateLogoSet(
  brandId: string,
  context: BrandContext,
  activity: Activity = silentActivity,
): Promise<LogoSet> {
  const name = (context.name ?? "").trim() || "Untitled";
  const markType = context.logoType ?? "wordmark";
  const key = logoInputsKey(context);

  // Reuse a brief written for these same inputs (e.g. redraw logos only).
  let briefMarkdown =
    context.visualIdentityBrief && context.visualIdentityBriefKey === key
      ? context.visualIdentityBrief
      : null;

  if (!briefMarkdown) {
    briefMarkdown = await generateVisualIdentityBrief(context, activity);
  }

  const concept = extractStrategyFromBrief(briefMarkdown);
  const palette = extractPaletteFromBrief(briefMarkdown);

  activity.emit(
    "thinking",
    "Visual identity brief ready",
    concept.slice(0, 400),
  );
  activity.emit(
    "note",
    `Brief written — ${briefMarkdown.length} characters; drawing ${VARIATION_COUNT} logo options`,
  );

  const done = activity.phase(`Drawing ${VARIATION_COUNT} logo options from the brief`);
  const marks = await Promise.all(
    Array.from({ length: VARIATION_COUNT }, async (_, slot): Promise<LogoMark> => {
      const variation = slot + 1;
      const label = `Option ${variation}`;
      const art = `Variation ${variation} of ${VARIATION_COUNT} from the visual identity brief.`;
      const prompt = logoFromVisualIdentityBrief({
        name,
        markType,
        briefMarkdown: briefMarkdown!,
        variation,
        totalVariations: VARIATION_COUNT,
        avoid: context.avoid,
      });
      try {
        const image = await renderLogoImage({
          brandId,
          phase: "chat-logo",
          slot: String(slot),
          prompt,
          quality: "medium",
          timeoutMs: RENDER_TIMEOUT_MS,
          onPrompt: (sent, model) =>
            activity.emit("prompt", `Prompt for ${label} (${model})`, sent),
        });
        return { slot, label, art, image_url: image.url };
      } catch (err) {
        const message = err instanceof Error ? err.message : "That mark could not be drawn.";
        activity.emit("warn", `"${label}" failed: ${message}`);
        return { slot, label, art, image_url: null, error: message };
      }
    }),
  );
  done();

  const drawn = marks.filter((m) => m.image_url).length;
  if (drawn === 0) {
    throw new Error(
      marks[0]?.error ?? "None of the marks could be drawn. Try again in a moment.",
    );
  }
  activity.emit("note", `Drew ${drawn} of ${marks.length} marks from the identity brief`);

  return {
    concept,
    visualIdentityBrief: briefMarkdown,
    palette:
      palette.length > 0
        ? palette
        : [
            { hex: "#14161A", role: "Primary" },
            { hex: "#F5F2ED", role: "Background" },
          ],
    marks,
    key,
  };
}
