// Drawing ONE mark from a skill-native visual identity brief.
//
// Pipeline:
//   1. brand-identity skill → full markdown visual identity brief
//   2. gpt-5.6-sol → one concrete logo construction (geometry, not mood)
//   3. gpt-image-2 (high quality) → one render from brief + construction
//   4. vision quality gate → one optional redesign+redraw if it fails

import { renderLogoImage, IMAGE_MODEL } from "@/lib/ai/images";
import type { Activity } from "@/lib/ai/activity";
import { silentActivity } from "@/lib/ai/activity";
import { logoFromVisualIdentityBrief } from "./logo-prompt";
import {
  extractPaletteFromBrief,
  extractStrategyFromBrief,
  generateVisualIdentityBrief,
} from "./identity-brief";
import { designLogoConstruction, type LogoConstruction } from "./logo-concept";
import { critiqueLogoImage } from "./logo-quality";
import type { BrandContext } from "./context";

export interface LogoMark {
  /** Index in the set, and the storage slot. */
  slot: number;
  /** The approach, from the construction — shown under the card. */
  label: string;
  /** The art direction it was drawn from. */
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

/** Chat ships a single mark, not a mill grid of near-duplicates. */
const VARIATION_COUNT = 1;

/** High quality unlocks GPT Image 2's stronger reasoning / fidelity path. */
const RENDER_QUALITY = "high" as const;

/** Time for one high-quality image (including a transient-status retry). */
const RENDER_TIMEOUT_MS = 150_000;

/**
 * The answers a set of marks depends on.
 *
 * Re-entering the step should show the mark already paid for, not spend more
 * renders drawing it again — but only while the brief behind it is unchanged.
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
  const avoid = context.avoid ?? [];

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

  activity.emit("thinking", "Visual identity brief ready", concept.slice(0, 400));
  activity.emit(
    "note",
    `Brief ready — drawing one mark with ${IMAGE_MODEL} (high quality)`,
  );

  let construction = await designLogoConstruction({
    name,
    markType,
    briefMarkdown,
    avoid,
    activity,
  });

  let mark = await renderOnce({
    brandId,
    name,
    markType,
    briefMarkdown,
    construction,
    avoid,
    slot: 0,
    activity,
  });

  if (mark.image_url) {
    const verdict = await critiqueLogoImage({
      imageUrl: mark.image_url,
      name,
      construction,
      briefExcerpt: concept,
      activity,
    });

    if (!verdict.pass) {
      activity.emit("note", "Redesigning after quality gate failure");
      construction = await designLogoConstruction({
        name,
        markType,
        briefMarkdown,
        avoid,
        revisionNote: verdict.note,
        activity,
      });
      mark = await renderOnce({
        brandId,
        name,
        markType,
        briefMarkdown,
        construction,
        avoid,
        slot: 1,
        revisionNote: verdict.note,
        activity,
      });

      if (mark.image_url) {
        // Second gate is advisory — we ship the redesign even if it still
        // scores low so the user is never stuck with nothing.
        await critiqueLogoImage({
          imageUrl: mark.image_url,
          name,
          construction,
          briefExcerpt: concept,
          activity,
        });
      }
    }
  }

  if (!mark.image_url) {
    throw new Error(mark.error ?? "The mark could not be drawn. Try again in a moment.");
  }

  activity.emit("note", `Drew "${mark.label}" from the identity brief`);

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
    marks: [mark],
    key,
  };
}

async function renderOnce(opts: {
  brandId: string;
  name: string;
  markType: string;
  briefMarkdown: string;
  construction: LogoConstruction;
  avoid: string[];
  slot: number;
  revisionNote?: string;
  activity: Activity;
}): Promise<LogoMark> {
  const { construction, activity } = opts;
  const done = activity.phase(`Rendering with ${IMAGE_MODEL}`);
  const prompt = logoFromVisualIdentityBrief({
    name: opts.name,
    markType: opts.markType,
    briefMarkdown: opts.briefMarkdown,
    construction,
    avoid: opts.avoid,
    revisionNote: opts.revisionNote,
  });

  try {
    const image = await renderLogoImage({
      brandId: opts.brandId,
      phase: "chat-logo",
      slot: String(opts.slot),
      prompt,
      quality: RENDER_QUALITY,
      timeoutMs: RENDER_TIMEOUT_MS,
      onPrompt: (sent, model) =>
        activity.emit("prompt", `Prompt for "${construction.label}" (${model})`, sent),
    });
    return {
      slot: 0,
      label: construction.label,
      art: construction.art,
      image_url: image.url,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "That mark could not be drawn.";
    activity.emit("warn", `Render failed: ${message}`);
    return {
      slot: 0,
      label: construction.label,
      art: construction.art,
      image_url: null,
      error: message,
    };
  } finally {
    done();
  }
}

// Re-export for callers that still reference the constant.
export { VARIATION_COUNT };
