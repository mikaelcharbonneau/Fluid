// Drawing the marks.
//
// Two stages, and the split is the point. `brand-identity` writes a visual
// identity brief — one concept, one palette, six described constructions —
// and only then does anything get rendered. The image model is never asked to
// invent an identity from a style keyword; it is asked to draw a mark that has
// already been designed in words.
//
// Six renders run at once. They are independent, each is slow, and doing them
// in sequence would spend the whole function budget on the first three.

import { renderLogoImage } from "@/lib/ai/images";
import type { Activity } from "@/lib/ai/activity";
import { silentActivity } from "@/lib/ai/activity";
import { runSkill } from "./run";
import { identityContract, parseIdentity, type IdentityBrief } from "./contracts";
import { markPrompt } from "./logo-prompt";
import type { BrandContext } from "./context";

export interface LogoMark {
  /** Index in the set, and the storage slot. */
  slot: number;
  /** The approach, from the brief — shown under the card. */
  label: string;
  /** The art direction it was drawn from. */
  art: string;
  /** Public URL of the rendered PNG, or null if this one failed. */
  image_url: string | null;
  /** Why it is missing, when it is. */
  error?: string;
}

export interface LogoSet {
  concept: string;
  palette: Array<{ hex: string; role: string }>;
  marks: LogoMark[];
  /** Identifies the inputs these were drawn for; see `logoInputsKey`. */
  key: string;
}

/** Time for one image. Six run together, so this is the wall clock, not a sum. */
const RENDER_TIMEOUT_MS = 120_000;

// The brief and the renders share the route's 300s, so this step cannot take
// the whole budget the way a text-only step can. The two together are capped
// well under it, leaving room for the save that follows.
const BRIEF_TIMEOUT_MS = 110_000;

/**
 * The answers a set of marks depends on.
 *
 * Re-entering the step should show the marks already paid for, not spend six
 * more renders drawing them again — but only while the brief behind them is
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

  const brief: IdentityBrief = await runSkill({
    skill: "brand-identity",
    // The one place the extra thinking earns its cost: this brief decides what
    // six images will be, and a weak construction cannot be recovered later.
    effort: "medium",
    maxTokens: 5_000,
    timeoutMs: BRIEF_TIMEOUT_MS,
    context,
    activity,
    contract: identityContract(name, markType, context.avoid ?? []),
    parse: parseIdentity,
  });

  activity.emit(
    "thinking",
    `The identity: ${brief.concept.split(/(?<=\.)\s/)[0]}`,
    `${brief.concept}\n\nPalette: ${brief.palette.map((p) => `${p.hex} (${p.role})`).join(", ")}`,
  );

  const done = activity.phase(`Drawing ${brief.marks.length} marks`);
  const marks = await Promise.all(
    brief.marks.map(async (mark, slot): Promise<LogoMark> => {
      const prompt = markPrompt({ name, markType, brief, mark, avoid: context.avoid });
      try {
        const image = await renderLogoImage({
          brandId,
          phase: "chat-logo",
          slot: String(slot),
          prompt,
          quality: "medium",
          timeoutMs: RENDER_TIMEOUT_MS,
          // The prompt is the single most useful thing to see when a mark
          // comes back wrong, and it is assembled from the brief rather than
          // written by hand — so log the copy that was actually sent.
          onPrompt: (sent, model) =>
            activity.emit("prompt", `Prompt for "${mark.label}" (${model})`, sent),
        });
        return { slot, label: mark.label, art: mark.art, image_url: image.url };
      } catch (err) {
        // One failed render must not lose the other five. The card shows the
        // gap and stays unpickable; the rest of the set is still usable.
        const message = err instanceof Error ? err.message : "That mark could not be drawn.";
        activity.emit("warn", `"${mark.label}" failed: ${message}`);
        return { slot, label: mark.label, art: mark.art, image_url: null, error: message };
      }
    }),
  );
  done();

  const drawn = marks.filter((m) => m.image_url).length;
  if (drawn === 0) {
    // Nothing to choose from is a failed step, not an empty one — say so
    // rather than presenting six broken cards.
    throw new Error(
      marks[0]?.error ?? "None of the marks could be drawn. Try again in a moment.",
    );
  }
  activity.emit("note", `Drew ${drawn} of ${marks.length} marks`);

  return {
    concept: brief.concept,
    palette: brief.palette,
    marks,
    key: logoInputsKey(context),
  };
}
