// Running a skill.
//
// A skill is prose written for an agent that has a filesystem, a terminal and
// a user who will read markdown. We have none of those: the answer has to come
// back as JSON a widget can render. So every call is three parts —
//
//   1. the skill body, verbatim and unedited;
//   2. the brand-context document it expects to have read;
//   3. an output contract saying what shape to answer in.
//
// Order matters. The contract goes last so that where it disagrees with the
// skill about presentation — the skill asks for a markdown table, we want an
// array — the contract is the more recent instruction. It only ever overrides
// *format*. Nothing in a contract tells a skill what to think.

import { generateOpenAIText } from "@/lib/ai/openai";
import { getSkill, FOUNDATION_SKILL } from "@/lib/skills";
import { renderBrandContext, type BrandContext } from "./context";
import type { Activity } from "@/lib/ai/activity";
import { silentActivity } from "@/lib/ai/activity";

/** Long enough for a real strategy answer, short of the route's own budget. */
const CALL_TIMEOUT_MS = 100_000;
const MAX_OUTPUT_TOKENS = 8_000;

export interface RunSkillOptions<T> {
  /** The skill whose instructions drive this call. */
  skill: string;
  /**
   * A second skill injected as background — the one the whole thread is
   * running. Naming inside a full brand build should know it is serving a
   * strategy, not answering in isolation.
   */
  supportingSkill?: string;
  context: BrandContext;
  /** What this call must return, in prose. Format only — never direction. */
  contract: string;
  /** Anything the step knows that the context document has no field for. */
  note?: string;
  /** Rejects the parsed value with a readable message; returns the typed value. */
  parse: (value: unknown) => T;
  activity?: Activity;
}

function composeInstructions(skill: string, supporting: string | undefined): string {
  const parts = [
    // The foundation skill explains what the context document is and that
    // everything else is written to read it first. Without it the main skill's
    // opening line ("check if .agents/brand-context.md exists") reads as an
    // instruction to go and look for a file.
    `You are running as part of Fluid, a brand studio. Your instructions are the
skill below. Follow it as written, with two adjustments to how it is delivered:

- The brand context it tells you to read is supplied in this conversation. It
  is not a file, and there is no filesystem. Do not try to open or write one.
- There is no interactive user to ask questions of. Work from the context you
  are given. Where it says a field is not captured yet, treat that as genuinely
  unknown: reason without it, and never invent a value to fill the gap.

--- SKILL: ${skill} ---
${getSkill(skill).body}`,
  ];

  if (supporting && supporting !== skill) {
    parts.push(
      `--- SUPPORTING SKILL: ${supporting} ---
Background only. This is the wider job the brand is being taken through; use it
for consistency of judgement, not as a second set of steps to run.

${getSkill(supporting).body}`,
    );
  }

  return parts.join("\n\n");
}

function composeInput(context: BrandContext, contract: string, note?: string): string {
  return [
    `--- ${FOUNDATION_SKILL.toUpperCase()} ---`,
    renderBrandContext(context),
    note ? `\n--- ALSO RELEVANT ---\n${note}` : "",
    "",
    "--- OUTPUT CONTRACT ---",
    contract.trim(),
    "",
    "Respond with ONLY that JSON object. No prose before or after it, no",
    "markdown code fences, no commentary. The reasoning belongs inside the",
    "fields that ask for it.",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Pull a JSON object out of the model's text.
 *
 * Asked for bare JSON, told not to use fences — and still worth tolerating
 * both, because the alternative is failing a five-minute conversation over a
 * pair of backticks.
 */
function extractJson(text: string): unknown {
  let raw = text.trim();
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) raw = fence[1].trim();

  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("The studio did not return a usable answer.");
  }
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    throw new Error("The studio's answer was not valid JSON.");
  }
}

export async function runSkill<T>({
  skill,
  supportingSkill,
  context,
  contract,
  note,
  parse,
  activity = silentActivity,
}: RunSkillOptions<T>): Promise<T> {
  const instructions = composeInstructions(skill, supportingSkill);
  const input = composeInput(context, contract, note);

  const done = activity.phase(`Running ${skill}`);
  // The prompt is the single most useful thing to see when an answer comes
  // back strange, and it is assembled from three sources — so log what was
  // actually sent rather than any one of them.
  activity.emit("prompt", `Prompt for ${skill}`, `${instructions}\n\n${input}`);

  let text: string;
  try {
    text = await generateOpenAIText({
      instructions,
      input,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      reasoningEffort: "medium",
      timeoutMs: CALL_TIMEOUT_MS,
      json: true,
    });
  } finally {
    done();
  }

  const parsed = parse(extractJson(text));
  activity.emit("note", `${skill} answered`);
  return parsed;
}
