// Which surface each step is answered on.
//
// The split is about what the answer *is*, not where it sits in the script:
// steps whose answer is words stay in the conversation, steps whose answer is
// something you look at go to the canvas. That is also why the canvas does not
// exist until `name` — before it there is nothing to show, and an empty panel
// beside a two-question conversation reads as a broken layout.

import type { StepKey } from "@/lib/brand-kit/steps";

export type Surface = "chat" | "canvas";

const CANVAS_STEPS: StepKey[] = ["name", "palette", "logoConcepts", "review"];

export function surfaceOf(step: StepKey): Surface {
  return CANVAS_STEPS.includes(step) ? "canvas" : "chat";
}

/** The step whose arrival brings the canvas on screen. */
export const FIRST_CANVAS_STEP: StepKey = "name";

/** Steps the composer can answer directly — the ones that take a sentence. */
const COMPOSABLE: StepKey[] = ["brief", "audience", "personality", "tagline"];

export function composerAnswers(step: StepKey): boolean {
  return COMPOSABLE.includes(step);
}

/** What the composer asks for, per step — the widgets' own placeholders. */
const PROMPTS: Partial<Record<StepKey, string>> = {
  brief: "What is this, who is it for, what does it do?",
  audience: "Who is this for?",
  personality: "3-5 traits — how it behaves in a room",
  tagline: "One short line",
};

export function composerPrompt(step: StepKey): string {
  return PROMPTS[step] ?? "Answer above to continue…";
}
