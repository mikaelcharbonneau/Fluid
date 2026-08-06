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
import { generateLogoSet, logoInputsKey, type LogoSet } from "./logo";
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
  | { kind: "logo"; logo: LogoSet }
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

/**
 * Does reaching this step cost a generation? Used to price the turn.
 *
 * The logo step is the exception worth naming: it is the only one that also
 * renders images, and re-entering it with an unchanged brief serves the set
 * already paid for rather than drawing six more.
 */
export function stepGenerates(step: Step, context: BrandContext): boolean {
  if (!step.skill) return false;
  if (step.key === "logo") return !cachedLogo(context);
  return true;
}

/** A stored mark set, if it still answers the brief the client has now. */
function cachedLogo(context: BrandContext): LogoSet | null {
  const cached = context.logoSet;
  if (!cached || cached.key !== logoInputsKey(context)) return null;
  // A set whose every render failed is not worth serving back.
  if (!cached.marks.some((m) => m.image_url)) return null;
  const brief =
    cached.visualIdentityBrief ??
    (context.visualIdentityBriefKey === cached.key ? context.visualIdentityBrief : undefined) ??
    "";
  const imagePrompt =
    cached.imagePrompt ??
    cached.marks.find((m) => m.image_prompt)?.image_prompt;
  const imageModel =
    cached.imageModel ??
    cached.marks.find((m) => m.image_model)?.image_model;
  return {
    concept: cached.concept,
    visualIdentityBrief: brief,
    palette: cached.palette,
    marks: cached.marks,
    key: cached.key,
    imagePrompt,
    imageModel,
  };
}

export async function renderStep(
  step: Step,
  context: BrandContext,
  activity: Activity,
  brandId = "",
): Promise<RenderedStep> {
  const base = { key: step.key, text: step.text };

  switch (step.key) {
    case "logo": {
      const cached = cachedLogo(context);
      if (cached) {
        activity.emit("note", "Reusing the marks already drawn for this brief");
        return { ...base, payload: { kind: "logo", logo: cached } };
      }
      return {
        ...base,
        payload: { kind: "logo", logo: await generateLogoSet(brandId, context, activity) },
      };
    }
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
