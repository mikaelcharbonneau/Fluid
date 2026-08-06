// Drawing ONE mark from a skill-native visual identity brief.
//
// Pipeline:
//   1. brand-identity skill → full markdown visual identity brief
//   2. gpt-5.6-sol → one concrete logo construction
//   3. gpt-image-2 (high) → one render
//   4. quality score (vision) → at most ONE redraw if score is catastrophic
//
// There is no loop. The first successful PNG is always kept as a fallback so
// a failed redesign or a route-timeout risk still leaves the user with a mark.

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
/** Slightly lighter on the optional redraw so we stay inside the route budget. */
const RETRY_RENDER_QUALITY = "medium" as const;

const RENDER_TIMEOUT_MS = 120_000;
const RETRY_RENDER_TIMEOUT_MS = 90_000;

/**
 * Hard wall for the whole logo step inside the route's 300s. If we are past
 * this after the first mark, we skip the quality-driven redraw entirely.
 */
const REDRAW_DEADLINE_MS = 200_000;

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
  const startedAt = Date.now();
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

  const construction = await designLogoConstruction({
    name,
    markType,
    briefMarkdown,
    avoid,
    activity,
  });

  const first = await renderOnce({
    brandId,
    name,
    markType,
    briefMarkdown,
    construction,
    avoid,
    slot: 0,
    quality: RENDER_QUALITY,
    timeoutMs: RENDER_TIMEOUT_MS,
    activity,
  });

  // Always prefer a successful first render. The quality gate may improve on
  // it once — it may never discard it in favour of nothing.
  let mark = first;

  if (first.image_url) {
    const verdict = await critiqueLogoImage({
      imageUrl: first.image_url,
      name,
      construction,
      briefExcerpt: concept,
      activity,
    });

    const elapsed = Date.now() - startedAt;
    const timeForRetry = elapsed < REDRAW_DEADLINE_MS;

    if (verdict.shouldRetry && timeForRetry) {
      // Exactly one attempt. No loop. Keep `first` if the redesign fails.
      activity.emit(
        "note",
        "One redesign attempt (not a loop) — first mark kept if this fails",
        verdict.note,
      );

      try {
        // Re-render only: same construction, revision notes in the image prompt.
        // A full second construction plan was blowing the 300s route budget.
        const second = await renderOnce({
          brandId,
          name,
          markType,
          briefMarkdown,
          construction,
          avoid,
          slot: 1,
          quality: RETRY_RENDER_QUALITY,
          timeoutMs: RETRY_RENDER_TIMEOUT_MS,
          revisionNote: verdict.note,
          activity,
        });
        if (second.image_url) {
          mark = second;
          activity.emit("note", `Shipped redesign "${second.label}"`);
        } else {
          activity.emit(
            "warn",
            "Redesign failed — shipping the first mark instead",
            second.error,
          );
          mark = first;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Redesign failed.";
        activity.emit("warn", `Redesign aborted — shipping the first mark (${message})`);
        mark = first;
      }
    } else if (verdict.shouldRetry && !timeForRetry) {
      activity.emit(
        "warn",
        `Quality score ${verdict.score}/100 but no time left for a redraw — shipping this mark`,
        verdict.note,
      );
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
  quality: "low" | "medium" | "high";
  timeoutMs: number;
  revisionNote?: string;
  activity: Activity;
}): Promise<LogoMark> {
  const { construction, activity } = opts;
  const done = activity.phase(`Rendering with ${IMAGE_MODEL} (${opts.quality})`);
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
      quality: opts.quality,
      timeoutMs: opts.timeoutMs,
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

export { VARIATION_COUNT };
