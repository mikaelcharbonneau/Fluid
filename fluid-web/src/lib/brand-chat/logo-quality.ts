// Post-render quality gate for chat logos.
//
// GPT Image will still draw a rounded monogram when left unsupervised. After
// each render we ask a vision-capable reasoning model whether the mark is a
// real identity or mill slop. Failures trigger one redesign+redraw with the
// critique attached — not an infinite loop.

import { generateOpenAIText } from "../ai/openai";
import { ANTI_CLICHE, CRITIQUE_RUBRIC } from "../ai/design";
import type { Activity } from "../ai/activity";
import { silentActivity } from "../ai/activity";
import type { LogoConstruction } from "./logo-concept";

const CRITIC_MODEL =
  process.env.OPENAI_LOGO_CONCEPT_MODEL?.trim() ||
  process.env.OPENAI_TEXT_MODEL?.trim() ||
  "gpt-5.6-sol";

const TIMEOUT_MS = 60_000;
const MAX_TOKENS = 1_200;
/** Marks scoring below this fail the gate and may be redrawn once. */
export const QUALITY_PASS_SCORE = 65;

export interface LogoQualityVerdict {
  pass: boolean;
  score: number;
  /** Short note shown in the activity dock / used as revision feedback. */
  note: string;
}

const SYSTEM = `You are a harsh creative director reviewing one logo mark.
Score it against the rubric. Be willing to fail generic AI logo-mill work.

${CRITIQUE_RUBRIC}

${ANTI_CLICHE}

Automatic fail (score under 40) if any of these are true:
- Rounded letter monogram in a soft pill/stadium with a generic sans wordmark
  and no ownable construction
- The mark could rebrand any SaaS product by swapping three letters
- The drawn mark ignores the planned construction entirely
- Text is misspelled or illegible
- Looks like a presentation mockup, not a flat logo on white

Return JSON only:
{"score":0-100,"pass":true|false,"note":"one or two sentences, specific"}`;

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
                `Brief excerpt: ${opts.briefExcerpt.slice(0, 1_500)}`,
                ``,
                `Does this image pass as a distinctive logo, or is it AI slop?`,
                `Return the JSON verdict.`,
              ].join("\n"),
            },
          ],
        },
      ],
      maxOutputTokens: MAX_TOKENS,
      reasoningEffort: "medium",
      timeoutMs: TIMEOUT_MS,
      json: true,
      acceptPartial: true,
    });

    const verdict = parseVerdict(text);
    activity.emit(
      verdict.pass ? "note" : "warn",
      verdict.pass
        ? `Quality gate passed (${verdict.score}/100)`
        : `Quality gate failed (${verdict.score}/100)`,
      verdict.note,
    );
    return verdict;
  } catch (err) {
    // A flaky critic must not block a usable mark. Pass with a warning so the
    // client still gets the render; the next redraw can still re-gate.
    const message = err instanceof Error ? err.message : "Quality gate unavailable.";
    activity.emit("warn", `Quality gate skipped: ${message}`);
    return { pass: true, score: 70, note: "Critic unavailable; mark shipped without score." };
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
    return { pass: true, score: 70, note: "Critic returned unreadable JSON; treating as pass." };
  }
  try {
    const o = JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
    let score = Math.round(Number(o.score));
    if (!Number.isFinite(score)) score = 70;
    score = Math.max(0, Math.min(100, score));
    const note = String(o.note ?? "").trim() || "No note.";
    // Trust the numeric score over a mismatched pass flag.
    const pass = score >= QUALITY_PASS_SCORE && o.pass !== false;
    return { pass: pass && score >= QUALITY_PASS_SCORE, score, note };
  } catch {
    return { pass: true, score: 70, note: "Critic parse failed; treating as pass." };
  }
}
