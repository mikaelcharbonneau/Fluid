// Turning the visual identity brief + a concrete construction into an image
// prompt for GPT Image 2.
//
// Long strategy alone produces SaaS mill marks. The construction supplies the
// geometry; anti-slop rules block the defaults the model reaches for first.

import type { IdentityBrief, MarkDirection } from "./contracts";
import type { LogoConstruction } from "./logo-concept";

// Kept inline (not imported from design.ts) so the pure verifier can compile
// this module without path aliases. Stay in sync with ANTI_CLICHE in design.ts.
const ANTI_SLOP = `Banned clichés — never produce these:
- The generic swoosh / arc "dynamism" gesture.
- Globe or abstract planet with latitude lines.
- Two or three overlapping translucent circles ("connection").
- Gradient blob / amorphous liquid shape.
- Generic hexagon, shield, or infinity symbol as the whole idea.
- Lowercase name with a colored full stop as the only idea.
- Chat bubble, light bulb, rocket, or handshake for tech/ideas/growth/trust.
- Letterform with a leaf stuck on it for anything "sustainable".
- Any mark whose idea is "modern and clean" — that is a finish, not an idea.
- Rounded monogram letter inside a soft pill, stadium, or lozenge container
  (the default "app icon H" every AI logo mill draws).
- Generic geometric sans wordmark + teal/mint accent icon that could rebrand
  as any SaaS product by changing three letters.
- Combination layout that is always "rounded icon left, word right" with no
  structural relationship between the two.
- Perfect mirror symmetry with no optical tension or ownable construction.
- Overused tech greens/teals as the only accent when the brief specifies a
  different palette.`;

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
    `A COMBINATION MARK: one symbol and the word "${name}", designed as a single
lockup with a structural relationship between symbol and type — not a clip-art
icon parked next to generic sans. The name must be spelled exactly "${name}"
and be fully legible. The symbol must work on its own.`,

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

function carriesText(markType: string): boolean {
  return markType === "wordmark" || markType === "lettermark" ||
    markType === "combination" || markType === "emblem";
}

/**
 * Build the prompt for one mark from a thin JSON identity (legacy path).
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
    ...antiSlopBlock(),
    ``,
    ...executionRules(name, markType, avoid),
  ];

  return lines.filter((l) => l !== "").join("\n");
}

/**
 * Single logo from full VIB + planned construction (chat production path).
 */
export function logoFromVisualIdentityBrief(opts: {
  name: string;
  markType: string;
  briefMarkdown: string;
  construction: LogoConstruction;
  avoid?: string[];
  /** Feedback from a failed quality gate, if redrawing. */
  revisionNote?: string;
}): string {
  const name = opts.name.trim() || "Brand";
  const markType = TYPE_INSTRUCTION[opts.markType] ? opts.markType : "wordmark";
  const avoid = (opts.avoid ?? []).filter(Boolean);
  const brief = opts.briefMarkdown.trim().slice(0, 10_000);
  const { construction } = opts;

  return [
    `Please generate ONE logo for my brand based on its visual identity brief`,
    `and the exact construction below. This is a finished identity mark, not a`,
    `mood board and not four variants.`,
    ``,
    `A professional brand logo, presented alone on a plain white background.`,
    ``,
    TYPE_INSTRUCTION[markType](name),
    ``,
    `OWNABLE IDEA: ${construction.idea}`,
    ``,
    `CONSTRUCTION TO DRAW EXACTLY (${construction.label}):`,
    construction.art,
    ``,
    `=== VISUAL IDENTITY BRIEF ===`,
    brief,
    `=== END BRIEF ===`,
    ``,
    `Follow the brief's strategy, logo direction, palette usage, and principles.`,
    `Borrow *mechanics* from any named references (restraint, industrial confidence,`,
    `system thinking) — never copy their trademarked marks.`,
    opts.revisionNote
      ? `\nREVISION REQUIRED — a creative director rejected the last render:\n${opts.revisionNote}\nFix those failures. Do not redraw the same rounded monogram/pill.`
      : "",
    ``,
    ...antiSlopBlock(),
    ``,
    ...executionRules(name, markType, avoid),
  ]
    .filter((l) => l !== "")
    .join("\n");
}

function antiSlopBlock(): string[] {
  return [
    `ANTI-SLOP (automatic fail if you draw these):`,
    ANTI_SLOP,
    `- Do not produce a "default AI startup logo": teal rounded letter-mark +`,
    `  Inter/geometric sans wordmark with no structural idea.`,
    `- Distinctiveness is required: one memorable, ownable move must be visible.`,
  ];
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
