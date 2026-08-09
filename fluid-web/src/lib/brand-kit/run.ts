// Running the brandkit skill for the strategy read.
//
// Same pattern the old brand-chat used (see the removed lib/brand-chat/run.ts):
// the skill body, verbatim, plus a plain-text brief block, plus a JSON output
// contract. No BrandContext, no flow — this skill runs once, from a short
// brief, not from a 20-field conversation state.

import { generateOpenAIText } from "@/lib/ai/openai";
import { getSkill } from "@/lib/skills";
import type { Activity } from "@/lib/ai/activity";
import { silentActivity } from "@/lib/ai/activity";
import type { BrandKitBrief } from "./types";

const DEFAULT_TIMEOUT_MS = 150_000;
const DEFAULT_MAX_TOKENS = 8_000;

function composeInstructions(skill: string): string {
  return [
    `You are running as part of Fluid, a brand studio. Your instructions are the
skill below. Follow it as written, with one adjustment to how it is delivered:
there is no filesystem and no interactive user. Work only from the brief you
are given below; where something is not stated, use your own judgement as the
skill directs rather than inventing a fact.`,
    ``,
    `--- SKILL: ${skill} ---`,
    getSkill(skill).body,
  ].join("\n");
}

function renderBrief(brief: BrandKitBrief): string {
  const lines = [
    `Brand name: ${brief.name}`,
    `Brief: ${brief.brief}`,
  ];
  if (brief.category) lines.push(`Category: ${brief.category}`);
  if (brief.audience) lines.push(`Audience: ${brief.audience}`);
  if (brief.visualMode) lines.push(`Visual mode chosen by the client: ${brief.visualMode}`);
  if (brief.layout) lines.push(`Layout chosen by the client: ${brief.layout}`);
  if (brief.avoid?.length) lines.push(`Must never appear: ${brief.avoid.join(", ")}`);
  return lines.join("\n");
}

function composeInput(brief: BrandKitBrief, contract: string): string {
  return [
    `--- BRIEF ---`,
    renderBrief(brief),
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
 * failing a paid render over a pair of backticks.
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
  brief: BrandKitBrief;
  contract: string;
  parse: (value: unknown) => T;
  activity?: Activity;
  effort?: "low" | "medium" | "high";
  maxTokens?: number;
  timeoutMs?: number;
}

export async function runBrandKitSkill<T>({
  skill,
  brief,
  contract,
  parse,
  activity = silentActivity,
  effort = "medium",
  maxTokens = DEFAULT_MAX_TOKENS,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: RunBrandKitSkillOptions<T>): Promise<T> {
  const instructions = composeInstructions(skill);
  const input = composeInput(brief, contract);
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
      throw new Error("The studio took too long working out the strategy. Try again.");
    }
    throw err;
  } finally {
    done();
  }

  const parsed = parse(extractJson(text));
  activity.emit("note", `${skill} answered`);
  return parsed;
}
