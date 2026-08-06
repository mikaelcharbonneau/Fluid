// One concrete logo construction, designed in words before any pixels.
//
// Image models ignore long strategy prose and fall back to SaaS defaults
// (rounded monogram + geometric sans). This step forces a single ownable
// geometric move — the thing a designer would sketch before opening Figma —
// so the renderer has something specific to draw.

import { generateOpenAIText } from "../ai/openai";
import { ANTI_CLICHE, DESIGN_PRINCIPLES } from "../ai/design";
import type { Activity } from "../ai/activity";
import { silentActivity } from "../ai/activity";

/** Reasoning model for construction + critique. Prefer the studio flagship. */
const CONCEPT_MODEL =
  process.env.OPENAI_LOGO_CONCEPT_MODEL?.trim() ||
  process.env.OPENAI_TEXT_MODEL?.trim() ||
  "gpt-5.6-sol";

const TIMEOUT_MS = 90_000;
const MAX_TOKENS = 4_000;

export interface LogoConstruction {
  /** Two to four words naming the approach. */
  label: string;
  /**
   * Concrete geometry a second designer could redraw from — shapes, joins,
   * negative space, stroke weight, type construction. Not mood adjectives.
   */
  art: string;
  /** The single ownable idea in one sentence. */
  idea: string;
}

const SYSTEM = `You are a senior identity designer. You design ONE logo
construction for a brand that already has a full visual identity brief.

Your job is not mood. Your job is geometry: a mark a draftsman could build.

${DESIGN_PRINCIPLES}

${ANTI_CLICHE}

Rules:
- Design exactly ONE construction — the strongest defensible mark for this brief.
- Prefer wordmark-led or structurally integrated combination marks when the
  brief asks for them. Do not default to "rounded letter in a pill + word".
- The "art" field must be concrete geometry (at least 120 characters). Mood
  words alone ("modern", "clean", "premium") are a failure.
- Name the ownable move. If you cannot name it, the design is not ready.
- Honour the brief's palette, logo direction, references (as mechanics, not
  copies), and avoid list.`;

function buildUserPrompt(opts: {
  name: string;
  markType: string;
  briefMarkdown: string;
  avoid: string[];
  revisionNote?: string;
}): string {
  const brief = opts.briefMarkdown.trim().slice(0, 10_000);
  return [
    `Brand name: ${opts.name}`,
    `Preferred mark structure: ${opts.markType}`,
    opts.avoid.length
      ? `Client refusals: ${opts.avoid.join(", ")}`
      : "Client refusals: none stated.",
    opts.revisionNote
      ? `\nA previous attempt failed the quality gate:\n${opts.revisionNote}\nDesign a stronger construction that fixes those failures.`
      : "",
    "",
    "=== VISUAL IDENTITY BRIEF ===",
    brief,
    "=== END BRIEF ===",
    "",
    `Return JSON only:`,
    `{"label":"...","art":"...","idea":"..."}`,
    `- label: 2–4 words`,
    `- art: one dense paragraph of construction (geometry, type, space)`,
    `- idea: one sentence naming the ownable move`,
  ]
    .filter((l) => l !== undefined)
    .join("\n");
}

function parseConstruction(text: string): LogoConstruction {
  let raw = text.trim();
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) raw = fence[1].trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end <= start) {
    throw new Error("The studio did not return a logo construction.");
  }
  const parsed = JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
  const label = String(parsed.label ?? "").trim();
  const art = String(parsed.art ?? "").trim();
  const idea = String(parsed.idea ?? "").trim();
  if (!label || art.length < 80 || !idea) {
    throw new Error("The studio's logo construction was too thin to draw from.");
  }
  return { label, art, idea };
}

/** Design one logo construction from the full visual identity brief. */
export async function designLogoConstruction(
  opts: {
    name: string;
    markType: string;
    briefMarkdown: string;
    avoid?: string[];
    revisionNote?: string;
    activity?: Activity;
  },
): Promise<LogoConstruction> {
  const activity = opts.activity ?? silentActivity;
  const done = activity.phase("Designing one logo construction");
  activity.emit("note", `Planning the mark with ${CONCEPT_MODEL}`);

  try {
    const text = await generateOpenAIText({
      model: CONCEPT_MODEL,
      instructions: SYSTEM,
      input: buildUserPrompt({
        name: opts.name,
        markType: opts.markType,
        briefMarkdown: opts.briefMarkdown,
        avoid: opts.avoid ?? [],
        revisionNote: opts.revisionNote,
      }),
      maxOutputTokens: MAX_TOKENS,
      reasoningEffort: "medium",
      timeoutMs: TIMEOUT_MS,
      json: true,
      acceptPartial: true,
    });
    const construction = parseConstruction(text);
    activity.emit(
      "thinking",
      construction.label,
      `${construction.idea}\n\n${construction.art}`,
    );
    return construction;
  } finally {
    done();
  }
}
