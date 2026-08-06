// Turning the visual identity brief into an image prompt.
//
// Not the wizard's prompt. That one starts from a style keyword and a curated
// reference, because that is what its flow collected. This one starts from the
// brief the conversation produced: the identity concept, the described
// construction of one mark, the palette, and the client's list of refusals.
//
// The structure below is deliberate. An image model weights the front of a
// prompt most heavily, so it opens with what the thing IS — a logo of a
// specific structural type — before any art direction. The refusals go last,
// where they read as constraints on everything above rather than as subject
// matter to include.

import type { IdentityBrief, MarkDirection } from "./contracts";

/** What each mark type actually asks the renderer to draw. */
const TYPE_INSTRUCTION: Record<string, (name: string) => string> = {
  wordmark: (name) =>
    `A WORDMARK: the word "${name}" set as custom lettering. The letterforms
themselves are the mark — draw them, do not pick a font and type it. Every
letter must be correct and legible, spelled exactly "${name}". No symbol, no
icon, no container.`,

  lettermark: (name) =>
    `A LETTERMARK: the initial${initials(name).length > 1 ? "s" : ""} "${initials(name)}" as the
entire mark, drawn as constructed letterforms. Nothing else — no full name, no
symbol beside it, no container. The interest is in how the letterform is built.`,

  combination: (name) =>
    `A COMBINATION MARK: one symbol beside the word "${name}", designed as a
single lockup. Symbol on the left, name on the right, optically aligned and
sharing a baseline. The name must be spelled exactly "${name}" and be fully
legible. The symbol must work on its own.`,

  pictorial: () =>
    `A PICTORIAL MARK: one recognisable real-world object, radically simplified
to its essential silhouette. No text or lettering anywhere in the image.`,

  abstract: () =>
    `An ABSTRACT MARK: one non-representational geometric form. It must not
resemble any real object and must not contain letters. No text anywhere in the
image.`,

  emblem: (name) =>
    `An EMBLEM: the word "${name}" locked inside a single enclosing shape —
a badge, seal or crest — so the container and the type read as one mark. The
name must be spelled exactly "${name}" and stay legible inside the shape.`,

  mascot: () =>
    `A MASCOT MARK: one character or creature, drawn in bold flat shapes with
no fine detail, reading clearly at small sizes. No text anywhere in the image.`,
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts.length > 1
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : parts[0].slice(0, 1).toUpperCase();
}

/**
 * Whether this mark type is allowed to contain letters at all.
 *
 * Worth being explicit about: an image model asked for an "abstract mark for
 * Cadence" will cheerfully add the word Cadence underneath. Saying so once,
 * plainly, is the difference between six usable marks and six captioned ones.
 */
function carriesText(markType: string): boolean {
  return markType === "wordmark" || markType === "lettermark" ||
    markType === "combination" || markType === "emblem";
}

/**
 * Build the prompt for one mark from a thin JSON identity (legacy path).
 *
 * Prefer {@link logoFromVisualIdentityBrief} — the skill-native brief carries
 * far more design signal than concept + one art paragraph.
 */
export function markPrompt(opts: {
  name: string;
  markType: string;
  brief: IdentityBrief;
  mark: MarkDirection;
  avoid?: string[];
}): string {
  const { name, brief, mark } = opts;
  const markType = TYPE_INSTRUCTION[opts.markType] ? opts.markType : "wordmark";
  const palette = brief.palette.map((p) => `${p.hex} (${p.role})`).join(", ");
  const avoid = (opts.avoid ?? []).filter(Boolean);

  const lines = [
    `A professional brand logo, presented alone on a plain white background.`,
    ``,
    TYPE_INSTRUCTION[markType](name),
    ``,
    `THE IDENTITY THIS BELONGS TO:`,
    brief.concept,
    ``,
    `THIS MARK — draw exactly this:`,
    mark.art,
    ``,
    `COLOUR: draw only from this palette — ${palette}. Use one or two of them,
not all five. Flat solid fills only.`,
    ``,
    ...executionRules(name, markType, avoid),
  ];

  return lines.filter((l) => l !== "").join("\n");
}

/**
 * Logo generation the way the user validated offline:
 * full visual identity brief markdown → image model.
 *
 * `variation` asks for distinct expressions *within* the brief's logo
 * direction (not six unrelated brands).
 */
export function logoFromVisualIdentityBrief(opts: {
  name: string;
  markType: string;
  briefMarkdown: string;
  variation: number;
  totalVariations: number;
  avoid?: string[];
}): string {
  const name = opts.name.trim() || "Brand";
  const markType = TYPE_INSTRUCTION[opts.markType] ? opts.markType : "wordmark";
  const avoid = (opts.avoid ?? []).filter(Boolean);
  const v = Math.max(1, opts.variation);
  const n = Math.max(1, opts.totalVariations);

  // Cap length so the image API stays within practical prompt limits while
  // still carrying strategy, logo direction, palette, and principles.
  const brief = opts.briefMarkdown.trim().slice(0, 12_000);

  return [
    `Please generate a logo for my brand based on its visual identity described below.`,
    ``,
    `A professional brand logo, presented alone on a plain white background.`,
    ``,
    TYPE_INSTRUCTION[markType](name),
    ``,
    `VARIATION ${v} of ${n}: a distinct expression that still obeys the same`,
    `identity brief — same strategy, palette discipline, and logo direction.`,
    `Do not invent a different brand personality.`,
    ``,
    `=== VISUAL IDENTITY BRIEF ===`,
    brief,
    `=== END BRIEF ===`,
    ``,
    `Follow the brief closely: strategy statement, logo direction (including`,
    `references and what to avoid), colour palette and usage rules, and design`,
    `principles. Prefer restraint and specificity over decoration.`,
    ``,
    ...executionRules(name, markType, avoid),
  ].join("\n");
}

function executionRules(name: string, markType: string, avoid: string[]): string[] {
  return [
    `EXECUTION:`,
    `- Flat vector artwork. Hard edges, solid fills, no gradients, no shading,`,
    `  no texture, no 3D, no bevels, no drop shadows, no glow.`,
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
    carriesText(markType)
      ? `- Any words other than "${name}". No tagline, no descriptor, no lorem ipsum.`
      : `- Any letter, word, number or symbol resembling text, anywhere.`,
    avoid.length ? `- Any of these, which the client has ruled out: ${avoid.join(", ")}.` : "",
  ];
}
