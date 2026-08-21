// Six logo concept renders: one planning call, then six concurrent images.
//
// Keeps the useful two-phase planning shape from the retired logo pipeline
// without coupling the conversational draft to that old implementation:
// one text call plans all 6 constructions together — seeing the whole set
// is what keeps them genuinely distinct — then all 6 render concurrently
// via Promise.allSettled so one failed render doesn't take the rest down
// with it.

import { runBrandKitSkill } from "./run";
import { renderDraft, type BrandKitDraft } from "./context";
import { renderLogoImage, IMAGE_MODEL } from "@/lib/ai/images";
import type { Activity } from "@/lib/ai/activity";
import type { LogoConcept, PaletteSwatch } from "./types";

const PLANNED_COUNT = 6;
const RENDER_QUALITY = "medium" as const;
const RENDER_TIMEOUT_MS = 90_000;

interface PlannedConcept {
  method: string;
  label: string;
  idea: string;
}

const PLAN_CONTRACT = `Using the skill's "LOGO CONCEPT METHODS" section, propose ${PLANNED_COUNT}
genuinely distinct logo constructions for this brand — each grounded in a
different method from that section (Monogram + Meaning, Product Action,
Metaphor Fusion, Negative Space, Construction Geometry). At most one of the
six may deliberately combine two methods, per the skill's own "use one or
combine two maximum" rule — the other five must each use exactly one.

Return JSON:
{ "concepts": [
    { "method": string,  // which method(s) from the skill section this uses
      "label": string,   // short name for this direction, e.g. "Monogram + Meaning"
      "idea": string }   // one sentence: the exact construction to draw
  ] } — exactly ${PLANNED_COUNT} entries.

Honour the skill's ANTI-GENERIC RULES: no generic swooshes, globes,
lightbulbs, or rounded-monogram-in-a-pill marks. Each of the six must be an
ownable, distinct move — not six versions of the same idea.`;

function parsePlan(json: unknown): PlannedConcept[] {
  const v = (json ?? {}) as Record<string, unknown>;
  const raw = v.concepts;
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error("The studio did not propose any logo concepts.");
  }
  const concepts = raw
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const e = entry as Record<string, unknown>;
      const method = typeof e.method === "string" ? e.method.trim() : "";
      const label = typeof e.label === "string" ? e.label.trim() : "";
      const idea = typeof e.idea === "string" ? e.idea.trim() : "";
      if (!label || !idea) return null;
      return { method, label, idea };
    })
    .filter((c): c is PlannedConcept => c !== null)
    .slice(0, PLANNED_COUNT);
  if (concepts.length === 0) throw new Error("The studio's logo concepts were malformed.");
  return concepts;
}

const ANTI_GENERIC = `Banned clichés — never produce these:
- The generic swoosh / arc "dynamism" gesture.
- Globe or abstract planet with latitude lines.
- Two or three overlapping translucent circles ("connection").
- Gradient blob / amorphous liquid shape.
- Generic hexagon, shield, or infinity symbol as the whole idea.
- Lowercase name with a colored full stop as the only idea.
- Chat bubble, light bulb, rocket, or handshake for tech/ideas/growth/trust.
- Any mark whose idea is "modern and clean" — that is a finish, not an idea.
- Rounded monogram letter inside a soft pill, stadium, or lozenge container
  (the default "app icon" every AI logo mill draws).
- Perfect mirror symmetry with no optical tension or ownable construction.`;

function conceptPrompt(opts: {
  name: string;
  category: string;
  palette: PaletteSwatch[];
  avoid: string[];
  concept: PlannedConcept;
}): string {
  const palette = opts.palette.map((p) => `${p.hex} (${p.role})`).join(", ") || "black on white";
  const avoid = opts.avoid.filter(Boolean);

  return [
    `A professional brand logo concept, presented alone on a plain white background.`,
    ``,
    `BRAND: "${opts.name}"${opts.category ? ` (${opts.category})` : ""}.`,
    ``,
    `CONSTRUCTION METHOD: ${opts.concept.label}${opts.concept.method ? ` (${opts.concept.method})` : ""}.`,
    `THE IDEA — draw exactly this: ${opts.concept.idea}`,
    ``,
    `If this construction is a monogram or wordmark-based idea, render the`,
    `name "${opts.name}" or its initial exactly correct and legible — draw`,
    `custom letterforms, do not pick a font and type it. If it is a purely`,
    `abstract or pictorial symbol, render no text at all.`,
    ``,
    `COLOUR: draw only from this palette — ${palette}. Use one or two of`,
    `them, not all. Flat solid fills only.`,
    ``,
    ANTI_GENERIC,
    ``,
    `EXECUTION:`,
    `- Flat vector artwork. Hard edges, solid fills, no gradients, no`,
    `  shading, no texture, no 3D, no bevels, no drop shadows, no glow.`,
    `- One idea, made of one or two elements. Not a scene, not a collage.`,
    `- Generous empty space around the mark; it must not touch the edges.`,
    `- Centred, upright, seen straight on.`,
    `- It must still read at 16 pixels: no hairlines, no fine detail.`,
    ``,
    `THE IMAGE MUST NOT CONTAIN:`,
    `- Any presentation dressing: no mockup, no business card, no sign, no`,
    `  device screen, no packaging, no photograph, no frame or border.`,
    `- Any grid, guides, swatches, annotations, dimensions or watermark.`,
    `- Multiple versions of the mark. Draw one mark, once.`,
    avoid.length ? `- Any of these, which the client has ruled out: ${avoid.join(", ")}.` : "",
  ]
    .filter((l) => l !== "")
    .join("\n");
}

export async function generateLogoConcepts(
  draft: BrandKitDraft,
  brandId: string,
  activity: Activity,
  batch = 0,
): Promise<LogoConcept[]> {
  activity.emit("note", "Planning 6 logo directions (brandkit skill)");
  const plan = await runBrandKitSkill({
    skill: "brandkit",
    contextText: renderDraft(draft),
    contract: PLAN_CONTRACT,
    parse: parsePlan,
    activity,
    effort: "medium",
    // Six fully-reasoned constructions is a bigger ask than the single-field
    // drafts elsewhere in this module — a reasoning model can burn through a
    // tight cap just thinking, leaving nothing for the JSON itself.
    maxTokens: 8_000,
    timeoutMs: 100_000,
  });

  const name = draft.name?.trim() || "Brand";
  const category = draft.category ?? "";
  const palette = draft.palette ?? [];
  const avoid = draft.avoid ?? [];

  activity.emit("note", `Drawing ${plan.length} logo concepts with ${IMAGE_MODEL} (medium quality)`);

  const settled = await Promise.allSettled(
    plan.map(async (concept): Promise<LogoConcept> => {
      // Globally unique, not positional: "Ask again" appends a fresh batch
      // to whatever's already been generated (see the turn route). A
      // positional slot like the old `String(i)` would collide with the
      // same slot in every earlier batch — since storage uploads upsert,
      // that silently overwrote an earlier batch's *stored image* at the
      // same path, so an old pick's imageUrl would start serving the new
      // batch's artwork even though nothing about the pick itself changed.
      const uniqueId = crypto.randomUUID();
      const prompt = conceptPrompt({ name, category, palette, avoid, concept });
      const image = await renderLogoImage({
        brandId,
        phase: "brandkit-logo-concepts",
        slot: uniqueId,
        prompt,
        quality: RENDER_QUALITY,
        timeoutMs: RENDER_TIMEOUT_MS,
        onPrompt: (sent, model) => {
          activity.emit("prompt", `Prompt for "${concept.label}" (${model})`, sent);
        },
      });
      return { id: `concept-${uniqueId}`, label: concept.label, idea: concept.idea, imageUrl: image.url, batch };
    }),
  );

  const concepts: LogoConcept[] = [];
  for (const outcome of settled) {
    if (outcome.status === "fulfilled") {
      concepts.push(outcome.value);
    } else {
      const message = outcome.reason instanceof Error ? outcome.reason.message : "A concept failed to render.";
      activity.emit("warn", `One logo concept failed: ${message}`);
    }
  }

  if (concepts.length === 0) {
    throw new Error("Every logo concept failed to render. Try again in a moment.");
  }

  activity.emit("note", `${concepts.length} of ${plan.length} logo concepts drawn`);
  return concepts;
}
