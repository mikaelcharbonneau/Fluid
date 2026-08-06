// Producing one step for the client.
//
// The client is told what to render; it never works out what comes next. This
// is where a step key becomes a question plus whatever the widget needs to
// draw itself — the generated options for the steps that have them, and
// nothing at all for the steps that are just a text box.

import type { Step } from "./flow";
import type { BrandContext } from "./context";
import type { Activity } from "@/lib/ai/activity";
import {
  generateDirections,
  generateKit,
  generateLaunchPlan,
  generateNames,
  generatePositionRead,
  generateTaglines,
  generateVoices,
} from "./generate";
import type {
  BrandKit,
  DirectionOption,
  LaunchPlan,
  NameCandidate,
  PositionRead,
  TaglineOption,
  VoiceOption,
} from "./contracts";

/**
 * What a widget needs beyond the question itself.
 *
 * A discriminated union on the step key, so the client cannot read `names` off
 * a voice step and the server cannot forget to send them.
 */
export type StepPayload =
  | { kind: "none" }
  | { kind: "name"; names: NameCandidate[] }
  | { kind: "direction"; directions: DirectionOption[]; recommended: string }
  | { kind: "position"; position: PositionRead }
  | { kind: "voice"; voices: VoiceOption[] }
  | { kind: "tagline"; taglines: TaglineOption[] }
  | { kind: "launch"; launch: LaunchPlan }
  | { kind: "kit"; kit: BrandKit };

export interface RenderedStep {
  key: string;
  /** What Fluid says. The client streams this in. */
  text: string;
  payload: StepPayload;
}

/** Does reaching this step cost a generation? Used to price the turn. */
export function stepGenerates(step: Step): boolean {
  // `logo` names a skill, but the marks come from the existing image pipeline
  // rather than from a text call here, so it is not billed by this route.
  return !!step.skill && step.key !== "logo";
}

export async function renderStep(
  step: Step,
  context: BrandContext,
  activity: Activity,
): Promise<RenderedStep> {
  const base = { key: step.key, text: step.text };

  switch (step.key) {
    case "name":
      return {
        ...base,
        payload: { kind: "name", names: await generateNames({ context, activity }) },
      };
    case "direction": {
      const { directions, recommended } = await generateDirections({ context, activity });
      return { ...base, payload: { kind: "direction", directions, recommended } };
    }
    case "position":
      return {
        ...base,
        payload: { kind: "position", position: await generatePositionRead({ context, activity }) },
      };
    case "voice":
      return {
        ...base,
        payload: { kind: "voice", voices: await generateVoices({ context, activity }) },
      };
    case "tagline":
      return {
        ...base,
        payload: { kind: "tagline", taglines: await generateTaglines({ context, activity }) },
      };
    case "launch":
      return {
        ...base,
        payload: { kind: "launch", launch: await generateLaunchPlan({ context, activity }) },
      };
    case "kit":
      return {
        ...base,
        payload: { kind: "kit", kit: await generateKit({ context, activity }) },
      };
    default:
      // Every other step is answered from fixed options or a text box. The
      // client already has those; sending them would be duplicating a list
      // that has to match on both sides anyway.
      return { ...base, payload: { kind: "none" } };
  }
}
