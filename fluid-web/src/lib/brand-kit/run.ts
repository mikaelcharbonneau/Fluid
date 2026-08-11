// Running the brandkit skill for one field's draft.
//
// Same pattern the old brand-chat used: the skill body, verbatim, plus a
// plain-text context block, plus a JSON output contract. Generic over what
// the context block says — the initial brief-only call and every later
// per-step draft call (which reads everything confirmed so far, via
// `context.ts`'s `renderDraft`) both go through this same function.

import { generateOpenAIText } from "@/lib/ai/openai";
import { getSkill } from "@/lib/skills";
import type { Activity } from "@/lib/ai/activity";
import { silentActivity } from "@/lib/ai/activity";

const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_MAX_TOKENS = 2_000;

function composeInstructions(skill: string): string {
  return [
    `You are running as part of Fluid, a brand studio. Your instructions are the
skill below. Follow it as written, with one adjustment to how it is delivered:
there is no filesystem and no interactive user. Work only from the context you
are given below; where something is not stated, use your own judgement as the
skill directs rather than inventing a fact.`,
    ``,
    `--- SKILL: ${skill} ---`,
    getSkill(skill).body,
  ].join("\n");
}

function composeInput(contextText: string, contract: string): string {
  return [
    `--- BRAND SO FAR ---`,
    contextText,
    ``,
    `--- OUTPUT CONTRACT ---`,
    contract.trim(),
    ``,
    `Respond with ONLY that JSON object. No prose before or after it, no`,
    `markdown code fences, no commentary.`,
  ].join("\n");
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
 * Pull a JSON object out of the model's text. Asked for bare JSON, told not
 * to use fences — worth tolerating both anyway, since the alternative is
 * failing a paid step over a pair of backticks.
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

export interface RunBrandKitSkillOptions<T> {
  skill: string;
  /** Everything confirmed so far, rendered as text — see `context.ts`. */
  contextText: string;
  contract: string;
  parse: (value: unknown) => T;
  activity?: Activity;
  effort?: "low" | "medium" | "high";
  maxTokens?: number;
  timeoutMs?: number;
}

export async function runBrandKitSkill<T>({
  skill,
  contextText,
  contract,
  parse,
  activity = silentActivity,
  effort,
  maxTokens = DEFAULT_MAX_TOKENS,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: RunBrandKitSkillOptions<T>): Promise<T> {
  const instructions = composeInstructions(skill);
  const input = composeInput(contextText, contract);
  const done = activity.phase(`Running ${skill}`);
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
      acceptPartial: true,
    });
  } catch (err) {
    if (isTimeout(err)) {
      throw new Error("The studio took too long on that step. Try again.");
    }
    throw err;
  } finally {
    done();
  }

  const parsed = parse(extractJson(text));
  activity.emit("note", `${skill} answered`);
  return parsed;
}
