// One function per generating step: pick the skill, hand it the contract,
// parse what comes back.
//
// The contracts and parsers live in ./contracts.ts, which has no dependencies
// and is exercised directly by `npm run verify:brand-chat`. This file is only
// the wiring between them and the model.
//
// Steps not represented here are the ones with nothing to generate — a text
// box for the brief, chips for the values. Those never call a model.

import { runSkill } from "./run";
import type { BrandContext } from "./context";
import type { Activity } from "@/lib/ai/activity";
import {
  AUDIENCE_CONTRACT,
  COMPETITORS_CONTRACT,
  DIRECTIONS_CONTRACT,
  KIT_CONTRACT,
  LAUNCH_CONTRACT,
  NAMES_CONTRACT,
  TAGLINES_CONTRACT,
  VOICES_CONTRACT,
  parseAudience,
  parseCompetitors,
  parseDirections,
  parseKit,
  parseLaunch,
  parseNames,
  parsePosition,
  parseTaglines,
  parseVoices,
  positionContract,
  type BrandKit,
  type DirectionOption,
  type LaunchPlan,
  type NameCandidate,
  type PositionRead,
  type TaglineOption,
  type VoiceOption,
} from "./contracts";

export type {
  BrandKit,
  DirectionOption,
  LaunchPlan,
  NameCandidate,
  PositionRead,
  TaglineOption,
  VoiceOption,
};

interface StepInput {
  context: BrandContext;
  activity?: Activity;
}

// Reasoning effort is the biggest lever on how long a step takes. Default to
// low once the context document is written: six directions, ten names, or a
// handful of taglines is closer to formatting than to multi-minute planning.
// Medium effort was timing out against the route budget on reasoning models
// that spend most of the call thinking before writing any JSON.
//
// The thread previously injected the flow's own skill as background on every
// call. For the full build that meant attaching brand-strategy — 2,300 tokens
// instructing the model to run a questionnaire and produce a complete strategy
// report — to a request for six short phrases. It invited exactly the
// over-thinking that was timing steps out, and the context document already
// carries every decision it would have contributed.

export async function generateNames(
  { context, activity }: StepInput,
  exclude: string[] = [],
): Promise<NameCandidate[]> {
  const seen = exclude.map((n) => n.trim()).filter(Boolean);
  return runSkill({
    skill: "brand-naming",
    // Low effort + enough output room is faster and more reliable than medium
    // reasoning that spends the deadline thinking before writing ten names.
    effort: "low",
    maxTokens: 12_000,
    timeoutMs: 220_000,
    context,
    activity,
    // "10 more" has to mean ten the user has not already rejected.
    note: seen.length
      ? `Already shown to this user — do not repeat any of these, and do not
offer near-variants of them: ${seen.join(", ")}.`
      : undefined,
    contract: NAMES_CONTRACT,
    parse: parseNames,
  });
}

export async function generateDirections({ context, activity }: StepInput): Promise<{
  directions: DirectionOption[];
  recommended: string;
}> {
  return runSkill({
    skill: "brand-identity",
    context,
    activity,
    contract: DIRECTIONS_CONTRACT,
    parse: parseDirections,
  });
}

/**
 * The positioning field, with the competitors actually placed on it.
 *
 * The prototype scattered competitor dots using a hash of their name, which
 * looks right and means nothing. Placing them is the one thing
 * `brand-positioning` exists to do, so it does it.
 */
export async function generatePositionRead({
  context,
  activity,
}: StepInput): Promise<PositionRead> {
  return runSkill({
    skill: "brand-positioning",
    context,
    activity,
    contract: positionContract((context.competitors ?? []).filter(Boolean)),
    parse: parsePosition,
  });
}

export async function generateVoices({ context, activity }: StepInput): Promise<VoiceOption[]> {
  return runSkill({
    skill: "brand-voice",
    context,
    activity,
    contract: VOICES_CONTRACT,
    parse: parseVoices,
  });
}

export async function generateTaglines({
  context,
  activity,
}: StepInput): Promise<TaglineOption[]> {
  return runSkill({
    skill: "brand-messaging",
    effort: "low",
    maxTokens: 8_000,
    timeoutMs: 220_000,
    context,
    activity,
    contract: TAGLINES_CONTRACT,
    parse: parseTaglines,
  });
}

export async function generateLaunchPlan({ context, activity }: StepInput): Promise<LaunchPlan> {
  return runSkill({
    skill: "brand-launch",
    context,
    activity,
    contract: LAUNCH_CONTRACT,
    parse: parseLaunch,
  });
}

export async function generateKit({ context, activity }: StepInput): Promise<BrandKit> {
  return runSkill({
    skill: "brand-guidelines",
    context,
    activity,
    contract: KIT_CONTRACT,
    parse: parseKit,
  });
}

// The "suggest for me" buttons. These steps are answerable without a model —
// the button is a shortcut — so a failure here is never fatal to the thread.

export async function suggestAudience({ context, activity }: StepInput): Promise<string[]> {
  return runSkill({
    skill: "target-audience",
    context,
    activity,
    contract: AUDIENCE_CONTRACT,
    parse: parseAudience,
  });
}

export async function suggestCompetitors({ context, activity }: StepInput): Promise<string[]> {
  return runSkill({
    skill: "competitor-branding",
    context,
    activity,
    contract: COMPETITORS_CONTRACT,
    parse: parseCompetitors,
  });
}
