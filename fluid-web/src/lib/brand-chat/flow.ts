// The conversation script: what gets asked, in what order, and which skill
// answers it.
//
// This is the server's copy and the authoritative one. The client renders
// whatever step the server hands it; it does not decide what comes next. That
// matters because the order encodes a dependency chain — naming reads the
// positioning, the visual direction reads the personality, the guidelines read
// all of it — and a client that could skip ahead would be asking a skill to
// run against a context that has not been filled in yet.
//
// The question text is deliberately written to never name a skill. The user is
// having a conversation, not filling in a form for `brand-positioning`.

export type WidgetKind =
  | "path"
  | "brief"
  | "category"
  | "stage"
  | "audience"
  | "problem"
  | "competitors"
  | "position"
  | "differentiator"
  | "personality"
  | "values"
  | "goal"
  | "name"
  | "direction"
  | "avoid"
  | "logoType"
  | "logo"
  | "voice"
  | "tagline"
  | "launch"
  | "kit";

export interface Step {
  key: WidgetKind;
  /** What Fluid says before the widget appears. */
  text: string;
  /**
   * The skill that produces this step's options, if any.
   *
   * Steps that only collect what the user already knows — the brief, the
   * audience, the problem — have no skill: there is nothing to generate, and
   * running a model over a text box would add latency and an opportunity to be
   * wrong for no gain.
   */
  skill?: string;
  /**
   * A skill used only for the widget's optional "suggest for me" button, where
   * the step is answerable without it.
   */
  assistSkill?: string;
}

export const STEPS: Step[] = [
  {
    key: "path",
    text: "Let's build something worth defending. What are we doing here?",
  },
  {
    key: "brief",
    text: "Tell me what this is. A sentence or two — I'll pull the rest out of you.",
  },
  {
    key: "category",
    text: "And what shelf does it sit on? Pick the closest — the interesting brands rarely fit cleanly.",
  },
  { key: "stage", text: "Where are you today?" },
  {
    key: "audience",
    text: "Who is this for? Be specific — “everyone who wants quality” is not an audience, it's a wish.",
    assistSkill: "target-audience",
  },
  {
    key: "problem",
    text: "What are they actually hiring you to fix? One frustration, in plain words.",
  },
  {
    key: "competitors",
    text: "Who are you standing next to? Direct rivals, and the ones you'd like to be mistaken for.",
    assistSkill: "competitor-branding",
  },
  {
    key: "position",
    text: "Here's the category as I read it. Drop yourself where you intend to sit — not where you are today.",
    skill: "brand-positioning",
  },
  {
    key: "differentiator",
    text: "Now the hard one. What do you do that they won't, or can't?",
  },
  {
    key: "personality",
    text: "If the brand walked into a room, how would it behave? Move these until they feel right.",
  },
  {
    key: "values",
    text: "Pick the three to five you'd actually fire someone over. Values you wouldn't defend aren't values.",
  },
  { key: "goal", text: "And what does the next twelve months have to deliver?" },
  {
    key: "name",
    text: "Ten names. None of them are your category with a vowel removed — that's the whole job. Take one, write your own, or ask for ten more.",
    skill: "brand-naming",
  },
  {
    key: "direction",
    text: "Six visual registers I'd defend for this brief. Pick the one that feels like you — everything else gets designed against it.",
    skill: "brand-identity",
  },
  {
    key: "avoid",
    text: "Anything that must never show up? Every good brief has a list of refusals.",
  },
  {
    key: "logoType",
    text: "What kind of mark is this? The structure decides more than the style does.",
  },
  {
    key: "logo",
    text: "Six marks — same DNA, different levels of confidence.",
    skill: "brand-identity",
  },
  {
    key: "voice",
    text: "How should it sound? Six registers, each with a line written in it. Pick the one you'd read back to a customer.",
    skill: "brand-voice",
  },
  {
    key: "tagline",
    text: "Five lines. A tagline isn't a description — it's the thing they repeat for you.",
    skill: "brand-messaging",
  },
  {
    key: "launch",
    text: "Last thing: when does this meet the world, and where first?",
    skill: "brand-launch",
  },
  {
    key: "kit",
    text: "That's the brand. Mark, palette, type, voice and the rules that keep it intact once other people touch it.",
    skill: "brand-guidelines",
  },
];

/**
 * The job the thread is doing, chosen by the first question.
 *
 * A single-job thread runs a subset and ends where its job ends — asking a
 * user who wants ten names to first place themselves on a positioning map is
 * how a good tool becomes a chore. `brand-strategy` is the underlying skill
 * for the full path; the shorter ones lean on whichever skill owns the output.
 */
export interface Flow {
  id: string;
  /** Shown in the header breadcrumb. */
  label: string;
  steps: WidgetKind[];
}

const FULL: WidgetKind[] = STEPS.map((s) => s.key);

export const FLOWS: Flow[] = [
  { id: "new", label: "New brand", steps: FULL },
  {
    // Upstream pairs diagnosis with transformation: brand-audit reads the
    // brand that exists, rebranding decides how far to move it. The prototype
    // left this path running the full from-scratch script, which would ask
    // someone with an existing brand to name it again.
    id: "audit",
    label: "Brand refresh",
    steps: ["path", "brief", "audience", "competitors", "position", "differentiator", "direction", "voice", "kit"],
  },
  { id: "name-only", label: "Naming", steps: ["path", "brief", "audience", "competitors", "name"] },
  {
    id: "logo-only",
    label: "Logo",
    steps: ["path", "brief", "name", "direction", "avoid", "logoType", "logo"],
  },
  { id: "voice-only", label: "Voice", steps: ["path", "brief", "audience", "personality", "voice"] },
  {
    id: "guidelines-only",
    label: "Guidelines",
    steps: ["path", "brief", "name", "direction", "voice", "kit"],
  },
  {
    id: "market",
    label: "Marketing",
    steps: ["path", "brief", "audience", "competitors", "position", "launch"],
  },
];

/** The skill each flow is fundamentally running, injected alongside the step's own. */
export const FLOW_SKILL: Record<string, string> = {
  new: "brand-strategy",
  audit: "brand-audit",
  "name-only": "brand-naming",
  "logo-only": "brand-identity",
  "voice-only": "brand-voice",
  "guidelines-only": "brand-guidelines",
  market: "brand-launch",
};

export function getFlow(path: string | undefined): Flow {
  return FLOWS.find((f) => f.id === path) ?? FLOWS[0];
}

export function getStep(key: string): Step | undefined {
  return STEPS.find((s) => s.key === key);
}

/** The ordered steps for a flow, resolved to their full definitions. */
export function flowSteps(path: string | undefined): Step[] {
  const flow = getFlow(path);
  return flow.steps
    .map((key) => STEPS.find((s) => s.key === key))
    .filter((s): s is Step => !!s);
}

/**
 * The step after `key` in this flow, or null at the end of the thread.
 *
 * An unknown key returns the first step rather than throwing: it means a
 * client resumed a thread whose flow has since changed shape, and restarting
 * the questions is a better answer than a 500.
 */
export function nextStep(path: string | undefined, key: string): Step | null {
  const steps = flowSteps(path);
  const i = steps.findIndex((s) => s.key === key);
  if (i === -1) return steps[0] ?? null;
  return steps[i + 1] ?? null;
}
