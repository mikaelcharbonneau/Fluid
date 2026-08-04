// Auto-cataloguing for the reference library.
//
// The first 250 references were tagged by hand. That does not scale to the
// thousands the library is heading for, and inconsistent tagging is worse than
// no tagging: Step 2's visual directions and Step 4's gallery both match
// against these attributes, so a drifting vocabulary quietly degrades both.
//
// Hence a CLOSED vocabulary. The model is given the exact list and its answer
// is filtered against it — anything invented is dropped rather than admitted,
// because one-off attributes match nothing and dilute the ones that do.

import { generateOpenAIText } from "./openai";

// Called many-at-a-time from a bounded worker pool (api/logo-references/tag)
// against a shared route-level deadline. A single vision call taking anywhere
// near this long would already be anomalous; bounding it here keeps one stuck
// call from quietly occupying a pool lane for the SDK's 10-minute default
// while the rest of the batch waits.
const CALL_TIMEOUT_MS = 60_000;

// The seven mark types, matching the CHECK constraint on logo_references.
export const MARK_TYPES = [
  "wordmark",
  "lettermark",
  "pictorial",
  "abstract",
  "mascot",
  "combination",
  "emblem",
] as const;

// The closed attribute vocabulary, grouped for the prompt. Grouping matters:
// it tells the model these are different *axes*, so it picks across them
// rather than returning five near-synonyms for the same quality.
export const ATTRIBUTE_GROUPS: { axis: string; terms: string[] }[] = [
  {
    axis: "Form and construction",
    terms: ["geometric", "organic", "angular", "rounded", "blobby", "symmetrical",
            "radial", "circular", "contained", "interlocking", "overlapping",
            "modular", "negative-space"],
  },
  {
    axis: "Weight and stroke",
    terms: ["heavy", "light", "monoline", "high-contrast", "condensed", "extended"],
  },
  {
    axis: "Typography (only when the mark contains letterforms)",
    terms: ["serif", "sans", "script", "display", "italic", "uppercase",
            "lowercase", "custom-letterform", "ligature", "outlined"],
  },
  {
    axis: "Colour and surface",
    terms: ["monochrome", "two-colour", "polychrome", "gradient", "grainy",
            "textured", "dimensional"],
  },
  {
    axis: "Character and era",
    terms: ["minimal", "playful", "elegant", "premium", "technical", "retro",
            "warm", "hand-drawn", "pixel"],
  },
  {
    axis: "Subject",
    terms: ["character", "illustrative", "pictorial-device", "silhouette",
            "accent-mark", "arched"],
  },
];

export const ATTRIBUTE_VOCABULARY: string[] = ATTRIBUTE_GROUPS.flatMap((g) => g.terms);

// Refinement axes, 0..1. Step 4 replaces style sliders with a like/dislike
// gallery: liking a mark averages the client toward its values, so these have
// to be a real reading of the artwork, not a restatement of its attributes.
//
// Deliberately independent of the nine style worlds in Step 2 — a Minimal mark
// can be quiet or bold — so they refine within a world rather than duplicating
// the choice of world.
export const REFINEMENT_AXES = ["boldness", "energy", "warmth", "detail"] as const;
export type RefinementAxis = (typeof REFINEMENT_AXES)[number];
export type Refinement = Record<RefinementAxis, number>;

export interface TaggedReference {
  name: string;
  markType: string;
  attributes: string[];
  industry: string | null;
  refinement: Refinement | null;
}

const INDUSTRIES = [
  "technology", "food", "health", "finance", "retail", "hospitality",
  "environment", "education", "entertainment", "sports", "real-estate",
];

function prompt(): string {
  const vocab = ATTRIBUTE_GROUPS.map(
    (g) => `${g.axis}:\n  ${g.terms.join(", ")}`,
  ).join("\n");
  return `You are cataloguing a logo for a design reference library.

Report what the mark IS, not whether it is good, and describe only what you can
actually see. Ignore any background photograph or mockup surface the logo has
been placed on — catalogue the mark itself.

NAME: the brand name as it appears in the artwork. If no name is legible,
describe the subject in one or two words instead.

MARK TYPE — exactly one of:
- wordmark: the full brand name as the mark, no separate symbol.
- lettermark: the initials as the mark — one letter or several — no full name.
- pictorial: a literal, recognisable object.
- abstract: non-literal geometry; no object and no letters.
- mascot: a character, creature or face with a personality.
- combination: a symbol AND the name, designed as one lockup.
- emblem: the name contained inside a badge, seal or crest.

The commonest mistake is calling something a wordmark or a pictorial when a
separate symbol sits beside the name — that is a combination. Check for a
symbol before choosing.

ATTRIBUTES: choose 4 to 7 terms from this closed vocabulary. Pick across
different axes rather than several near-synonyms from one. Use ONLY these exact
terms — do not invent any, and omit an axis entirely if none of it applies:

${vocab}

Note: "monochrome" describes almost every mark, so include it only when a
single flat colour is genuinely a defining trait of the design.

INDUSTRY: one of ${INDUSTRIES.join(", ")} — or null if it is not obvious from
the mark alone. Do not guess from the brand name.

REFINEMENT: place the mark on each axis, 0 to 1, to two decimals. Judge the
artwork itself, and use the full range — a set of marks that all score near 0.5
carries no information. These are independent of each other: a mark can be bold
and calm, or quiet and energetic.

- boldness  0 = quiet, light, understated · 1 = heavy, dominant, high presence
- energy    0 = still, settled, symmetrical · 1 = kinetic, diagonal, in motion
- warmth    0 = cool, clinical, precise · 1 = warm, soft, human, approachable
- detail    0 = one reduced gesture · 1 = intricate, many parts, richly built

Reply with ONLY a JSON object, no prose and no code fence:
{"name":"...","mark_type":"...","attributes":["...","..."],"industry":null,
 "refinement":{"boldness":0.0,"energy":0.0,"warmth":0.0,"detail":0.0}}`;
}

// Parse defensively and filter against the closed sets. A model answer that
// invents an attribute or a type is partially usable, so keep what is valid
// rather than discarding the whole row — but never let an unknown value reach
// the database, where the CHECK constraint would reject the insert anyway.
export function parseTagResponse(raw: string): TaggedReference | null {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(match[0]) as Record<string, unknown>;
  } catch {
    return null;
  }

  const markType = String(parsed.mark_type ?? "").trim().toLowerCase();
  if (!MARK_TYPES.includes(markType as (typeof MARK_TYPES)[number])) return null;

  const attributes = Array.isArray(parsed.attributes)
    ? [...new Set(
        parsed.attributes
          .map((a) => String(a).trim().toLowerCase())
          .filter((a) => ATTRIBUTE_VOCABULARY.includes(a)),
      )]
    : [];
  if (!attributes.length) return null;

  const name = String(parsed.name ?? "").trim().slice(0, 80);
  if (!name) return null;

  const rawIndustry = parsed.industry == null ? "" : String(parsed.industry).trim().toLowerCase();
  const industry = INDUSTRIES.includes(rawIndustry) ? rawIndustry : null;

  // Axes are all-or-nothing: a partial reading would silently average the
  // client toward 0 on whichever axis went missing, which is a real answer
  // ("very quiet") rather than an absent one. Better to store none.
  const rawRefinement = parsed.refinement as Record<string, unknown> | undefined;
  let refinement: Refinement | null = null;
  if (rawRefinement && typeof rawRefinement === "object") {
    const values = {} as Refinement;
    const complete = REFINEMENT_AXES.every((axis) => {
      const n = Number(rawRefinement[axis]);
      if (!Number.isFinite(n)) return false;
      values[axis] = Math.min(1, Math.max(0, Math.round(n * 100) / 100));
      return true;
    });
    if (complete) refinement = values;
  }

  return { name, markType, attributes, industry, refinement };
}

// Catalogue one image. Throws on transport failure so the caller can record
// which paths still need a pass; returns null when the answer was unusable.
export async function tagReferenceImage(imageUrl: string): Promise<TaggedReference | null> {
  const text = await generateOpenAIText({
    instructions: "Analyse the supplied logo image according to the user's instructions.",
    input: [{
      role: "user",
      content: [
        { type: "input_image", image_url: imageUrl, detail: "high" },
        { type: "input_text", text: prompt() },
      ],
    }],
    json: true,
    maxOutputTokens: 400,
    reasoningEffort: "low",
    timeoutMs: CALL_TIMEOUT_MS,
  });
  return parseTagResponse(text);
}
