// Running a skill.
//
// Skills are markdown playbooks written for agents that write files (see
// brand-building-skills). Fluid has no filesystem, so every call is:
//
//   1. the skill body, verbatim;
//   2. the brand-context document rendered the way skills expect to read it;
//   3. an output contract — either the skill's native markdown deliverable
//      (documents) or a tight JSON shape (widgets).
//
// Document mode is how Claude used the plugin: full visual identity briefs,
// naming reports, etc. JSON mode is for chips and maps that need structure.

import { generateOpenAIText } from "@/lib/ai/openai";
import { getSkill, FOUNDATION_SKILL } from "@/lib/skills";
import { renderBrandContext, type BrandContext } from "./context";
import { getFlow } from "./flow";
import type { Activity } from "@/lib/ai/activity";
import { silentActivity } from "@/lib/ai/activity";

// The route has 300s. A step that is only a text call can have most of it;
// the logo step, which follows its brief with image renders, passes a smaller
// budget of its own.
const DEFAULT_TIMEOUT_MS = 220_000;
const DEFAULT_MAX_TOKENS = 8_000;
/** Full skill deliverables (identity briefs) need more room than chip JSON. */
const DOCUMENT_MAX_TOKENS = 24_000;
const DOCUMENT_TIMEOUT_MS = 150_000;

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

export interface RunSkillDocumentOptions {
  skill: string;
  context: BrandContext;
  /**
   * How to present the deliverable. Should ask for the skill's native Output
   * section (markdown), not a JSON widget schema.
   */
  contract: string;
  note?: string;
  activity?: Activity;
  effort?: "low" | "medium" | "high";
  maxTokens?: number;
  timeoutMs?: number;
  /** Minimum length for a usable document. */
  minChars?: number;
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
  When the skill says to write a file (e.g. a brief or brand-context.md), produce
  that document's full contents in your reply instead — that is the deliverable.
- There is no interactive user to ask questions of. Work from the context you
  are given. Where it says a field is not captured yet, treat that as genuinely
  unknown: reason without it, and never invent a value to fill the gap.

--- SKILL: ${skill} ---
${getSkill(skill).body}`,
  ].join("\n\n");
}

function composeContextBlock(context: BrandContext, note?: string): string {
  return [
    `The client is here to do one job: ${getFlow(context.path).label.toLowerCase()}.`,
    "",
    `--- ${FOUNDATION_SKILL.toUpperCase()} ---`,
    renderBrandContext(context),
    note ? `\n--- ALSO RELEVANT ---\n${note}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function composeJsonInput(context: BrandContext, contract: string, note?: string): string {
  return [
    composeContextBlock(context, note),
    "",
    "--- OUTPUT CONTRACT ---",
    contract.trim(),
    "",
    "Respond with ONLY that JSON object. No prose before or after it, no",
    "markdown code fences, no commentary. The reasoning belongs inside the",
    "fields that ask for it.",
  ].join("\n");
}

function composeDocumentInput(context: BrandContext, contract: string, note?: string): string {
  return [
    composeContextBlock(context, note),
    "",
    "--- OUTPUT CONTRACT ---",
    contract.trim(),
    "",
    "Respond with the full document as markdown. Do not wrap the entire",
    "document in a code fence. Do not return JSON. Do not ask follow-up",
    "questions — produce the deliverable now from the context above.",
  ].join("\n");
}

async function callModel(opts: {
  skill: string;
  instructions: string;
  input: string;
  effort: "low" | "medium" | "high";
  maxTokens: number;
  timeoutMs: number;
  json: boolean;
  activity: Activity;
}): Promise<string> {
  const done = opts.activity.phase(`Running ${opts.skill}`);
  opts.activity.emit(
    "prompt",
    `Prompt for ${opts.skill}`,
    `${opts.instructions}\n\n${opts.input}`,
  );
  try {
    return await generateOpenAIText({
      instructions: opts.instructions,
      input: opts.input,
      maxOutputTokens: opts.maxTokens,
      reasoningEffort: opts.effort,
      timeoutMs: opts.timeoutMs,
      json: opts.json,
      acceptPartial: true,
    });
  } catch (err) {
    if (isTimeout(err)) {
      throw new Error(
        `The studio took too long on this step. Everything you have answered is saved — try it again and it picks up from here.`,
      );
    }
    throw err;
  } finally {
    done();
  }
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

function cleanMarkdownDocument(text: string): string {
  let raw = text.trim();
  // Models sometimes wrap the whole brief in one fence despite instructions.
  const whole = raw.match(/^```(?:markdown|md)?\s*([\s\S]*?)```\s*$/i);
  if (whole) raw = whole[1].trim();
  return raw;
}

/** Widget-shaped JSON from a skill (names chips, voice cards, etc.). */
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
  const text = await callModel({
    skill,
    instructions: composeInstructions(skill),
    input: composeJsonInput(context, contract, note),
    effort,
    maxTokens,
    timeoutMs,
    json: true,
    activity,
  });

  const parsed = parse(extractJson(text));
  activity.emit("note", `${skill} answered`);
  return parsed;
}

/**
 * Skill-native markdown deliverable — the Claude Code path.
 *
 * Used when the product artifact is the skill's own Output section (visual
 * identity brief, naming report, guidelines), not a UI widget schema.
 */
export async function runSkillDocument({
  skill,
  context,
  contract,
  note,
  activity = silentActivity,
  effort = "medium",
  maxTokens = DOCUMENT_MAX_TOKENS,
  timeoutMs = DOCUMENT_TIMEOUT_MS,
  minChars = 800,
}: RunSkillDocumentOptions): Promise<string> {
  const text = await callModel({
    skill,
    instructions: composeInstructions(skill),
    input: composeDocumentInput(context, contract, note),
    effort,
    maxTokens,
    timeoutMs,
    json: false,
    activity,
  });

  const document = cleanMarkdownDocument(text);
  if (document.length < minChars) {
    throw new Error("The studio returned a brief that was too thin to use.");
  }
  if (!/^#\s+/m.test(document) && !/^##\s+/m.test(document)) {
    throw new Error("The studio did not return a structured markdown brief.");
  }
  activity.emit("note", `${skill} wrote the document (${document.length} chars)`);
  return document;
}
