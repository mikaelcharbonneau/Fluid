// The brand-context document — the state every skill reads before it runs.
//
// Upstream's `brand-context` skill defines a markdown file at
// `.agents/brand-context.md` and every other skill opens with "check if
// .agents/brand-context.md exists". We have no filesystem and many tenants, so
// the document lives in `brands.data.chat` as structured JSON and is rendered
// into exactly the markdown the skills were written against at the moment a
// skill runs. The skills are unmodified; only the delivery changed.
//
// Rendering to their format rather than inventing our own is the whole point:
// it is what lets an upstream skill update land as a text diff instead of a
// migration.

export interface Position {
  /** 0 = accessible, 1 = premium. */
  x: number;
  /** 0 = functional, 1 = emotional. */
  y: number;
}

export interface Personality {
  tone: number; // 1 playful … 8 serious
  formality: number; // 1 casual … 8 formal
  price: number; // 1 affordable … 8 premium
  era: number; // 1 classic … 8 innovative
  volume: number; // 1 muted … 8 bold
}

export const DEFAULT_PERSONALITY: Personality = {
  tone: 5,
  formality: 4,
  price: 6,
  era: 6,
  volume: 3,
};

/**
 * Everything the chat has collected for one brand.
 *
 * Every field is optional because the thread is answered one question at a
 * time and a skill can run against a half-filled document — that is normal,
 * not an error state. What is *not* allowed is inventing a value to fill a
 * gap: `renderBrandContext` marks anything missing as not captured, so a skill
 * knows the difference between "the user said premium" and "nobody has asked".
 */
export interface BrandContext {
  /** Which flow this thread is running — see flow.ts. */
  path?: string;

  brief?: string;
  category?: string;
  stage?: string;
  website?: string;

  audience?: string[];
  problem?: string;
  audienceLanguage?: string;

  competitors?: string[];
  position?: Position;
  differentiator?: string;

  personality?: Personality;
  values?: string[];
  mission?: string;

  goal?: string;
  metrics?: string;

  name?: string;
  tagline?: string;

  direction?: string;
  avoid?: string[];
  logoType?: string;
  /**
   * The mark the client picked: its public URL and the art direction behind
   * it. Stored so the kit can show the real logo, and so re-entering the step
   * does not lose the choice.
   */
  logo?: { image_url: string; label: string; art: string };
  /**
   * Full visual identity brief from the brand-identity skill (markdown).
   * This is the same class of deliverable Claude writes offline — logo gen
   * and later kit work should read it whole, not a JSON stub.
   */
  visualIdentityBrief?: string;
  /** logoInputsKey the brief was written for; used to decide reuse vs rewrite. */
  visualIdentityBriefKey?: string;
  /**
   * The last set of marks drawn, and the brief they answer.
   *
   * Image renders are expensive. Keeping the set means going back a step and
   * forward again shows the marks already paid for; `logoSet.key` decides
   * whether they still apply. Typed loosely here to keep this module free of
   * a dependency on the renderer.
   */
  logoSet?: {
    concept: string;
    /** Full markdown brief (may duplicate visualIdentityBrief). */
    visualIdentityBrief?: string;
    palette: Array<{ hex: string; role: string }>;
    marks: Array<{ slot: number; label: string; art: string; image_url: string | null; error?: string }>;
    key: string;
  };

  /** The chosen register's name, e.g. "Quiet Coach" — not its id. */
  voice?: string;
  /** The line of copy that register was chosen on. */
  voiceSample?: string;
  launchTiming?: string;
  launchChannels?: string[];
}

const NOT_CAPTURED = "Not captured yet";

const SLIDERS: Array<{ key: keyof Personality; low: string; high: string }> = [
  { key: "tone", low: "Playful", high: "Serious" },
  { key: "formality", low: "Casual", high: "Formal" },
  { key: "price", low: "Affordable", high: "Premium" },
  { key: "era", low: "Classic", high: "Innovative" },
  { key: "volume", low: "Muted", high: "Bold" },
];

/** The five sliders as the adjectives a strategist would actually write down. */
export function personalityWords(p: Personality): string[] {
  return SLIDERS.map((s) => (p[s.key] > 4 ? s.high : s.low));
}

/** The two axes the skills call "tone", kept in their vocabulary. */
export function toneLine(p: Personality): string {
  return [
    p.formality > 4 ? "formal" : "casual",
    p.tone > 4 ? "serious" : "playful",
  ].join(", ");
}

/**
 * The positioning map click, in the words `brand-context` asks for.
 *
 * Its "Market Position" field wants premium / value / niche / mass. The map's
 * horizontal axis is exactly that spectrum; the vertical axis (functional to
 * emotional) is extra information the skills can still use, so it is reported
 * alongside rather than flattened away.
 */
export function marketPosition(pos: Position): string {
  const price = pos.x > 0.66 ? "premium" : pos.x > 0.33 ? "mid-market" : "value";
  const appeal = pos.y > 0.5 ? "emotional" : "functional";
  return `${price} (${appeal} appeal)`;
}

function list(values: string[] | undefined): string {
  const clean = (values ?? []).map((v) => v.trim()).filter(Boolean);
  return clean.length ? clean.join(", ") : NOT_CAPTURED;
}

function text(value: string | undefined): string {
  const clean = (value ?? "").trim();
  return clean || NOT_CAPTURED;
}

/**
 * Render the context as the markdown document the skills expect to read.
 *
 * The headings and field names are copied from `brand-context`'s own Output
 * section. Do not "improve" them — a skill that says "read Positioning →
 * Differentiation" is matching on this text.
 */
export function renderBrandContext(ctx: BrandContext): string {
  const personality = ctx.personality;

  return [
    "# Brand Context",
    "",
    "## Brand",
    `- **Name**: ${text(ctx.name)}`,
    `- **Category**: ${text(ctx.category)}`,
    `- **Description**: ${text(ctx.brief)}`,
    `- **Stage**: ${text(ctx.stage)}`,
    `- **Website**: ${text(ctx.website)}`,
    "",
    "## Audience",
    `- **Primary Audience**: ${list(ctx.audience)}`,
    `- **Key Problem**: ${text(ctx.problem)}`,
    `- **Their Language**: ${text(ctx.audienceLanguage)}`,
    "",
    "## Positioning",
    `- **Differentiation**: ${text(ctx.differentiator)}`,
    `- **Competitors**: ${list(ctx.competitors)}`,
    `- **Market Position**: ${ctx.position ? marketPosition(ctx.position) : NOT_CAPTURED}`,
    "",
    "## Brand Personality",
    `- **Personality Words**: ${personality ? personalityWords(personality).join(", ") : NOT_CAPTURED}`,
    `- **Tone**: ${personality ? toneLine(personality) : NOT_CAPTURED}`,
    // Upstream's "Voice Admires" means *other brands* whose voice this one
    // wants to borrow from. The chat never asks that, and putting our own
    // chosen register here would answer a different question — so it stays
    // uncaptured and the register is reported below, where it belongs.
    `- **Voice Admires**: ${NOT_CAPTURED}`,
    "",
    "## Values & Mission",
    `- **Core Values**: ${list(ctx.values)}`,
    `- **Mission**: ${text(ctx.mission)}`,
    "",
    "## Goals",
    `- **Primary Goal**: ${text(ctx.goal)}`,
    `- **Key Metrics**: ${text(ctx.metrics)}`,
    "",
    // Not part of upstream's structure: decisions this product collects that
    // the original document has nowhere to put. Kept in a clearly separate
    // section so the sections above stay a faithful copy of the contract.
    "## Identity decisions (Fluid)",
    `- **Chosen mark**: ${ctx.logo ? `${ctx.logo.label} — ${ctx.logo.art}` : NOT_CAPTURED}`,
    `- **Chosen voice**: ${text(ctx.voice)}`,
    `- **Voice, written**: ${text(ctx.voiceSample)}`,
    `- **Chosen tagline**: ${text(ctx.tagline)}`,
    `- **Visual direction**: ${text(ctx.direction)}`,
    `- **Mark type**: ${text(ctx.logoType)}`,
    `- **Never use**: ${list(ctx.avoid)}`,
    `- **Launch timing**: ${text(ctx.launchTiming)}`,
    `- **Launch channels**: ${list(ctx.launchChannels)}`,
    `- **Visual identity brief**: ${ctx.visualIdentityBrief ? "captured (see document below)" : NOT_CAPTURED}`,
    "",
    // When present, the full brief is appended so downstream skills (voice,
    // guidelines) and any re-run of identity can read the same artifact Claude
    // would have left on disk as a markdown file.
    ctx.visualIdentityBrief
      ? ["## Visual Identity Brief (full document)", "", ctx.visualIdentityBrief, ""].join("\n")
      : "",
  ].join("\n");
}

/**
 * Read the context out of a brand row's `data` blob.
 *
 * Everything lives under `data.chat` so the card-and-step wizard, which writes
 * flat keys on the same blob, is unaffected by anything the chat does. The two
 * can run against the same brand without either noticing the other.
 */
export function readBrandContext(data: unknown): BrandContext {
  const blob = (data ?? {}) as Record<string, unknown>;
  const chat = blob.chat;
  if (!chat || typeof chat !== "object" || Array.isArray(chat)) return {};
  return chat as BrandContext;
}

/** The `data` patch that stores a context, for `brands_merge_data`. */
export function brandContextPatch(ctx: BrandContext): Record<string, unknown> {
  return { chat: ctx };
}
