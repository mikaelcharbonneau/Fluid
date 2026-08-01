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

import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-opus-4-8";

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

export interface TaggedReference {
  name: string;
  markType: string;
  attributes: string[];
  industry: string | null;
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

Reply with ONLY a JSON object, no prose and no code fence:
{"name":"...","mark_type":"...","attributes":["...","..."],"industry":null}`;
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

  return { name, markType, attributes, industry };
}

// Catalogue one image. Throws on transport failure so the caller can record
// which paths still need a pass; returns null when the answer was unusable.
export async function tagReferenceImage(imageUrl: string): Promise<TaggedReference | null> {
  const client = new Anthropic();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 400,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "url", url: imageUrl } },
          { type: "text", text: prompt() },
        ],
      },
    ],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  return parseTagResponse(text);
}
