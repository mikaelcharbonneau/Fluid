// Post-render quality score for chat logos.
//
// This is a gate with a hard ceiling of ONE optional redraw — never a loop.
// The critic is calibrated so competent-but-imperfect marks score mid-range
// and ship; only clear mill slop scores low enough to justify a single retry.
// If anything goes wrong (timeout, parse, missing image), we treat that as
// "ship what we have" rather than blocking the user.

import { generateOpenAIText } from "../ai/openai";
import { ANTI_CLICHE } from "../ai/design";
import type { Activity } from "../ai/activity";
import { silentActivity } from "../ai/activity";
import type { LogoConstruction } from "./logo-concept";

const CRITIC_MODEL =
  process.env.OPENAI_LOGO_CONCEPT_MODEL?.trim() ||
  process.env.OPENAI_TEXT_MODEL?.trim() ||
  "gpt-5.6-sol";

const TIMEOUT_MS = 45_000;
const MAX_TOKENS = 800;

/**
 * Soft pass line for messaging. Marks at or above this are presented as
 * having cleared the gate. Below it we may still ship them (see logo.ts).
 */
export const QUALITY_PASS_SCORE = 50;

/**
 * Only scores strictly below this may trigger the single automatic redraw.
 * Mid-range "not great but usable" marks ship without burning another 2+
 * minutes of construction + high-quality image time.
 */
export const QUALITY_RETRY_BELOW = 35;

export interface LogoQualityVerdict {
  pass: boolean;
  /** True when the score is bad enough to justify one redesign attempt. */
  shouldRetry: boolean;
  score: number;
  /** Short note shown in the activity dock / used as revision feedback. */
  note: string;
}

const SYSTEM = `You are a creative director scoring one flat logo on a white background.
Be honest but calibrated — most competent flat logos score 45–75. Reserve
scores under 35 for clear AI logo-mill clichés or broken work.

Scoring guide (use the full range):
- 80–100: Distinctive, ownable construction; would survive a client review
- 60–79: Solid professional mark with a clear idea
- 45–59: Usable but generic or weak idea — shippable with notes
- 35–44: Weak / cliché-leaning but still a real logo
- 0–34: Clear mill slop, illegible type, mockup, or ignores the plan entirely

${ANTI_CLICHE}

Score under 35 only if one of these is clearly true:
- Rounded letter monogram in a soft pill/stadium + generic sans, no ownable move
- Could rebrand any SaaS product by swapping three letters
- Ignores the planned construction entirely
- Text misspelled or illegible
- Presentation mockup (card, screen, scene) rather than a flat mark on white

Do NOT fail a mark just for being simple, monochrome, or restrained.
Do NOT fail because it is not award-winning.

Return JSON only:
{"score":0-100,"note":"one sentence, specific and fair"}`;

export async function critiqueLogoImage(opts: {
  imageUrl: string;
  name: string;
  construction: LogoConstruction;
  briefExcerpt: string;
  activity?: Activity;
}): Promise<LogoQualityVerdict> {
  const activity = opts.activity ?? silentActivity;
  const done = activity.phase("Quality gate");
  try {
    const text = await generateOpenAIText({
      model: CRITIC_MODEL,
      instructions: SYSTEM,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_image",
              image_url: opts.imageUrl,
              detail: "high",
            },
            {
              type: "input_text",
              text: [
                `Brand name: ${opts.name}`,
                `Planned construction (${opts.construction.label}): ${opts.construction.art}`,
                `Ownable idea: ${opts.construction.idea}`,
                `Brief excerpt: ${opts.briefExcerpt.slice(0, 1_200)}`,
                ``,
                `Score this logo. Return JSON only.`,
              ].join("\n"),
            },
          ],
        },
      ],
      maxOutputTokens: MAX_TOKENS,
      reasoningEffort: "low",
      timeoutMs: TIMEOUT_MS,
      json: true,
      acceptPartial: true,
    });

    const verdict = parseVerdict(text);
    activity.emit(
      verdict.pass ? "note" : "warn",
      verdict.pass
        ? `Quality gate ${verdict.score}/100 — shipping`
        : verdict.shouldRetry
          ? `Quality gate ${verdict.score}/100 — one redraw allowed`
          : `Quality gate ${verdict.score}/100 — shipping with notes`,
      verdict.note,
    );
    return verdict;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Quality gate unavailable.";
    activity.emit("warn", `Quality gate skipped: ${message}`);
    return {
      pass: true,
      shouldRetry: false,
      score: 70,
      note: "Critic unavailable; mark shipped without score.",
    };
  } finally {
    done();
  }
}

function parseVerdict(text: string): LogoQualityVerdict {
  let raw = text.trim();
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) raw = fence[1].trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end <= start) {
    return {
      pass: true,
      shouldRetry: false,
      score: 70,
      note: "Critic returned unreadable JSON; treating as pass.",
    };
  }
  try {
    const o = JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
    let score = Math.round(Number(o.score));
    if (!Number.isFinite(score)) score = 70;
    score = Math.max(0, Math.min(100, score));
    const note = String(o.note ?? "").trim() || "No note.";
    return {
      pass: score >= QUALITY_PASS_SCORE,
      shouldRetry: score < QUALITY_RETRY_BELOW,
      score,
      note,
    };
  } catch {
    return {
      pass: true,
      shouldRetry: false,
      score: 70,
      note: "Critic parse failed; treating as pass.",
    };
  }
}
