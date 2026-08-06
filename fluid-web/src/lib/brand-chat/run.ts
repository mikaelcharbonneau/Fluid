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
import { getFlow } from "./flow";
import type { Activity } from "@/lib/ai/activity";
import { silentActivity } from "@/lib/ai/activity";

// The route has 300s. A step that is only a text call can have most of it;
// the logo step, which follows its brief with six image renders, passes a
// smaller budget of its own. 180s was still tight for medium-effort naming
// and messaging once reasoning models spend a long first pass thinking.
const DEFAULT_TIMEOUT_MS = 220_000;
const DEFAULT_MAX_TOKENS = 8_000;

export interface RunSkillOptions<T> {
  /** The skill whose instructions drive this call. */
  skill: string;
  context: BrandContext;
  /** What this call must return, in prose. Format only — never direction. */
  contract: string;
  /** Anything the step knows that the context document has no field for. */
  note?: string;
  /** Rejects the parsed value with a readable message; returns the typed value. */
  parse: (value: unknown) => T;
  activity?: Activity;
  /**
   * How hard to think. Most steps do not need much: six directions with a
   * six-word note each is a formatting job once the context is written, and
   * reasoning effort is the single biggest lever on how long a call takes.
   * Reserve "medium" for the steps where judgement is the product.
   */
  effort?: "low" | "medium" | "high";
  /** Cap on the answer. Generous caps let a reasoning model spend more. */
  maxTokens?: number;
  /** Deadline for this one call. Must fit inside whatever else the step does. */
  timeoutMs?: number;
}

function composeInstructions(skill: string): string {
  return [
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
  ].join("\n\n");
}

function composeInput(context: BrandContext, contract: string, note?: string): string {
  return [
    // What the wider job is, in one line. The flow's own skill used to be
    // injected in full for this; naming the job costs a sentence and conveys
    // the same thing the 2,300-token version did.
    `The client is here to do one job: ${getFlow(context.path).label.toLowerCase()}.`,
    "",
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

function isTimeout(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { name?: string; message?: string };
  return (
    e.name === "TimeoutError" ||
    e.name === "AbortError" ||
    /timed? ?out|aborted/i.test(e.message ?? "")
  );
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
  context,
  contract,
  note,
  parse,
  activity = silentActivity,
  effort = "low",
  maxTokens = DEFAULT_MAX_TOKENS,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: RunSkillOptions<T>): Promise<T> {
  const instructions = composeInstructions(skill);
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
      maxOutputTokens: maxTokens,
      reasoningEffort: effort,
      timeoutMs,
      json: true,
      // Prefer a salvageable partial over a hard abort when the model hits the
      // output ceiling after already writing usable JSON.
      acceptPartial: true,
    });
  } catch (err) {
    // A raw abort surfaces as "The operation was aborted due to timeout",
    // which tells the client nothing about what to do next. The answer that
    // led here is already saved — the route stores it before generating — so
    // the useful thing to say is that retrying resumes rather than restarts.
    if (isTimeout(err)) {
      throw new Error(
        `The studio took too long on this step. Everything you have answered is saved — try it again and it picks up from here.`,
      );
    }
    throw err;
  } finally {
    done();
  }

  const parsed = parse(extractJson(text));
  activity.emit("note", `${skill} answered`);
  return parsed;
}
