// The agent's toolbox: what the model is allowed to do, and what happens
// when it does it.
//
// Every generator tool is a thin, unmodified call into brand-chat's
// generate.ts/logo.ts — the model decides WHEN to call propose_names, not
// HOW names get generated. Every context-writing tool goes through
// answer.ts's applyAnswer, the same validator the classic hardcoded flow
// uses, so a malformed or hostile tool argument is rejected exactly as it
// would be from that flow's own client.

import { applyAnswer } from "@/lib/brand-chat/answer";
import type { BrandContext } from "@/lib/brand-chat/context";
import type { WidgetKind } from "@/lib/brand-chat/flow";
import type { StepPayload } from "@/lib/brand-chat/step";
import {
  generateDirections,
  generateKit,
  generateNames,
  generatePositionRead,
  generateTaglines,
  generateVoices,
} from "@/lib/brand-chat/generate";
import { generateLogoSet, logoInputsKey, type LogoSet } from "@/lib/brand-chat/logo";
import type { Activity } from "@/lib/ai/activity";
import type { ToolDef } from "@/lib/ai/openai";
import type { AgentState } from "./transcript";

// ---- elicitation tools (free) -----------------------------------------

/** The BrandContext fields with no dedicated generator/select tool — the
 * only keys record_answer is allowed to write. Deliberately excludes
 * name/direction/voice/tagline/logo (their matching select_* tool owns
 * them) and path (the agent mode always runs the full build, there is no
 * flow picker to record). */
export const RECORD_ANSWER_KEYS = [
  "brief", "category", "stage", "audience", "problem", "competitors",
  "differentiator", "personality", "values", "goal", "avoid", "logoType",
] as const satisfies readonly WidgetKind[];

export type RecordAnswerKey = (typeof RECORD_ANSWER_KEYS)[number];

const RECORD_ANSWER_TOOL: ToolDef = {
  type: "function",
  name: "record_answer",
  description:
    "Record the user's answer to one of the fixed brand-context fields. Use " +
    "this whenever the user's reply maps onto a field this app already " +
    "knows how to store. Do NOT use this for name, direction, voice, " +
    "tagline, or logo — those are set automatically by their matching " +
    "propose_*/select_* tools, never recorded directly.",
  parameters: {
    type: "object",
    properties: {
      key: { type: "string", enum: [...RECORD_ANSWER_KEYS] },
      value: {
        description:
          "Shaped for this key. brief/category/stage/differentiator/goal/" +
          "logoType: a string. audience/competitors/values/avoid: an array " +
          "of short strings. personality: an object " +
          '{tone,formality,price,era,volume}, each an integer 1-8 (1=playful/' +
          "casual/affordable/classic/muted, 8=serious/formal/premium/" +
          "innovative/bold).",
      },
    },
    required: ["key", "value"],
    additionalProperties: false,
  },
};

const ASK_QUESTION_TOOL: ToolDef = {
  type: "function",
  name: "ask_question",
  description:
    "Ask the user one question and stop this turn to wait for their reply. " +
    "Use this for anything that is not a direct match for record_answer's " +
    "fixed keys — a clarifying follow-up, a yes/no check, or offering a " +
    "choice you generated yourself rather than one of the propose_* tools.",
  parameters: {
    type: "object",
    properties: {
      text: { type: "string", description: "The question, exactly as the user will read it." },
      input_type: { type: "string", enum: ["text", "single_select", "multi_select"] },
      options: {
        type: "array",
        items: { type: "string" },
        description: "Required when input_type is single_select or multi_select; omit for text.",
      },
    },
    required: ["text", "input_type"],
    additionalProperties: false,
  },
};

const SELECT_NAME_TOOL: ToolDef = {
  type: "function",
  name: "select_name",
  description: "Record which proposed name the user picked (or one they wrote themselves).",
  parameters: {
    type: "object",
    properties: { name: { type: "string" } },
    required: ["name"],
    additionalProperties: false,
  },
  strict: true,
};

const SELECT_DIRECTION_TOOL: ToolDef = {
  type: "function",
  name: "select_direction",
  description: "Record which visual direction the user picked.",
  parameters: {
    type: "object",
    properties: { direction: { type: "string" } },
    required: ["direction"],
    additionalProperties: false,
  },
  strict: true,
};

const SELECT_VOICE_TOOL: ToolDef = {
  type: "function",
  name: "select_voice",
  description: "Record which voice register the user picked.",
  parameters: {
    type: "object",
    properties: {
      name: { type: "string" },
      sample: { type: "string", description: "The sample line shown for that register." },
    },
    required: ["name"],
    additionalProperties: false,
  },
  strict: true,
};

const SELECT_TAGLINE_TOOL: ToolDef = {
  type: "function",
  name: "select_tagline",
  description: "Record which tagline the user picked.",
  parameters: {
    type: "object",
    properties: { text: { type: "string" } },
    required: ["text"],
    additionalProperties: false,
  },
  strict: true,
};

const SELECT_LOGO_TOOL: ToolDef = {
  type: "function",
  name: "select_logo",
  description: "Record the rendered mark the user accepted (from generate_logo's result).",
  parameters: {
    type: "object",
    properties: {
      image_url: { type: "string" },
      label: { type: "string" },
      art: { type: "string" },
    },
    required: ["image_url", "label"],
    additionalProperties: false,
  },
  strict: true,
};

// ---- generator tools (billable) ----------------------------------------

const EMPTY_OBJECT_SCHEMA = { type: "object", properties: {}, additionalProperties: false } as const;

const PROPOSE_NAMES_TOOL: ToolDef = {
  type: "function",
  name: "propose_names",
  description:
    "Generate 10 candidate names from everything captured so far. Call " +
    "once brief/audience/category/differentiator are known. Calling this " +
    "again after the user asks for more avoids repeating earlier names.",
  parameters: EMPTY_OBJECT_SCHEMA,
};

const PROPOSE_DIRECTIONS_TOOL: ToolDef = {
  type: "function",
  name: "propose_directions",
  description: "Generate 6 visual-direction options for the logo/identity.",
  parameters: EMPTY_OBJECT_SCHEMA,
};

const READ_POSITION_TOOL: ToolDef = {
  type: "function",
  name: "read_position",
  description: "Read the brand's market position against its named competitors.",
  parameters: EMPTY_OBJECT_SCHEMA,
};

const PROPOSE_VOICES_TOOL: ToolDef = {
  type: "function",
  name: "propose_voices",
  description: "Generate 6 voice registers, each with a sample line.",
  parameters: EMPTY_OBJECT_SCHEMA,
};

const PROPOSE_TAGLINES_TOOL: ToolDef = {
  type: "function",
  name: "propose_taglines",
  description: "Generate 5 taglines.",
  parameters: EMPTY_OBJECT_SCHEMA,
};

const GENERATE_LOGO_TOOL: ToolDef = {
  type: "function",
  name: "generate_logo",
  description:
    "Draw the visual identity brief and render one logo mark. Requires " +
    "name, logoType, and direction to already be recorded.",
  parameters: EMPTY_OBJECT_SCHEMA,
};

const GENERATE_KIT_TOOL: ToolDef = {
  type: "function",
  name: "generate_kit",
  description:
    "Assemble the final brand guidelines document. Call this last, once " +
    "name, direction, voice, tagline, and logo are all selected — it ends " +
    "the conversation.",
  parameters: EMPTY_OBJECT_SCHEMA,
};

/** Every tool the model is offered, in the order they read best in a prompt. */
export const ALL_TOOL_DEFS: ToolDef[] = [
  RECORD_ANSWER_TOOL,
  ASK_QUESTION_TOOL,
  PROPOSE_NAMES_TOOL,
  SELECT_NAME_TOOL,
  PROPOSE_DIRECTIONS_TOOL,
  SELECT_DIRECTION_TOOL,
  READ_POSITION_TOOL,
  PROPOSE_VOICES_TOOL,
  SELECT_VOICE_TOOL,
  PROPOSE_TAGLINES_TOOL,
  SELECT_TAGLINE_TOOL,
  GENERATE_LOGO_TOOL,
  SELECT_LOGO_TOOL,
  GENERATE_KIT_TOOL,
];

/** Tool calls that cost a generation credit. Checked by loop.ts BEFORE
 * dispatch — runTool itself never gates on billing, it only executes. */
export const GENERATOR_TOOL_NAMES = new Set([
  "propose_names", "propose_directions", "read_position",
  "propose_voices", "propose_taglines", "generate_logo", "generate_kit",
]);

export function isGeneratorTool(name: string): boolean {
  return GENERATOR_TOOL_NAMES.has(name);
}

// ---- dispatch ------------------------------------------------------------

export interface ToolContext {
  brandId: string;
  activity: Activity;
}

export interface ToolRunResult {
  context: BrandContext;
  proposedNames: string[];
  /** JSON-stringified — becomes the function_call_output's `output` field. */
  output: string;
  /** Set only by a generator tool that produced something to show — reuses
   * brand-chat's own StepPayload shapes so the existing widgets render it
   * with no translation layer. */
  clientPayload?: StepPayload;
  /** Set true once generate_kit has run. */
  done?: boolean;
}

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

/** A stored mark set, if it still answers the brief the client has now.
 * Mirrors brand-chat/step.ts's private cachedLogo() — duplicated rather
 * than imported since that function isn't exported, but it's a small,
 * pure read of fields already on BrandContext, not a behavior fork. */
function cachedLogoSet(context: BrandContext): LogoSet | null {
  const cached = context.logoSet;
  if (!cached || cached.key !== logoInputsKey(context)) return null;
  if (!cached.marks.some((m) => m.image_url)) return null;
  const brief =
    cached.visualIdentityBrief ??
    (context.visualIdentityBriefKey === cached.key ? context.visualIdentityBrief : undefined) ??
    "";
  return {
    concept: cached.concept,
    visualIdentityBrief: brief,
    palette: cached.palette,
    marks: cached.marks,
    key: cached.key,
  };
}

/**
 * Run one tool call. Never throws for a validation failure — those come
 * back as `{"error": "..."}` in `output` so the model can recover
 * conversationally, the same way a bad answer from the classic flow's
 * client would be rejected without tearing down the thread. A thrown error
 * here means something unexpected (a generator's own model call failing,
 * a network error) — the caller (loop.ts) decides what to do with that.
 */
export async function runTool(
  name: string,
  args: unknown,
  state: AgentState,
  tc: ToolContext,
): Promise<ToolRunResult> {
  const context = state.context;
  const a = (args ?? {}) as Record<string, unknown>;

  const recordable = new Set<string>(RECORD_ANSWER_KEYS);

  if (name === "record_answer") {
    const key = asString(a.key);
    if (!recordable.has(key)) {
      return { context, proposedNames: state.proposedNames, output: JSON.stringify({ error: `Unknown or unrecordable key: "${key}".` }) };
    }
    try {
      const next = applyAnswer(key as WidgetKind, a.value, context);
      return { context: next, proposedNames: state.proposedNames, output: JSON.stringify({ recorded: key }) };
    } catch (err) {
      const message = err instanceof Error ? err.message : "That answer could not be recorded.";
      return { context, proposedNames: state.proposedNames, output: JSON.stringify({ error: message }) };
    }
  }

  if (name === "select_name" || name === "select_direction" || name === "select_voice" ||
      name === "select_tagline" || name === "select_logo") {
    const key = name.slice("select_".length) as WidgetKind;
    const value =
      name === "select_name" ? a.name :
      name === "select_direction" ? a.direction :
      name === "select_voice" ? { name: a.name, sample: a.sample } :
      name === "select_tagline" ? a.text :
      { image_url: a.image_url, label: a.label, art: a.art };
    try {
      const next = applyAnswer(key, value, context);
      return { context: next, proposedNames: state.proposedNames, output: JSON.stringify({ recorded: key }) };
    } catch (err) {
      const message = err instanceof Error ? err.message : "That selection could not be recorded.";
      return { context, proposedNames: state.proposedNames, output: JSON.stringify({ error: message }) };
    }
  }

  if (name === "propose_names") {
    const names = await generateNames({ context, activity: tc.activity }, state.proposedNames);
    const proposedNames = [...state.proposedNames, ...names.map((n) => n.name)];
    return {
      context, proposedNames,
      output: JSON.stringify({ names }),
      clientPayload: { kind: "name", names },
    };
  }

  if (name === "propose_directions") {
    const { directions, recommended } = await generateDirections({ context, activity: tc.activity });
    return {
      context, proposedNames: state.proposedNames,
      output: JSON.stringify({ directions, recommended }),
      clientPayload: { kind: "direction", directions, recommended },
    };
  }

  if (name === "read_position") {
    const position = await generatePositionRead({ context, activity: tc.activity });
    return {
      context, proposedNames: state.proposedNames,
      output: JSON.stringify({ position }),
      clientPayload: { kind: "position", position },
    };
  }

  if (name === "propose_voices") {
    const voices = await generateVoices({ context, activity: tc.activity });
    return {
      context, proposedNames: state.proposedNames,
      output: JSON.stringify({ voices }),
      clientPayload: { kind: "voice", voices },
    };
  }

  if (name === "propose_taglines") {
    const taglines = await generateTaglines({ context, activity: tc.activity });
    return {
      context, proposedNames: state.proposedNames,
      output: JSON.stringify({ taglines }),
      clientPayload: { kind: "tagline", taglines },
    };
  }

  if (name === "generate_logo") {
    const cached = cachedLogoSet(context);
    const logo = cached ?? (await generateLogoSet(tc.brandId, context, tc.activity));
    return {
      context, proposedNames: state.proposedNames,
      output: JSON.stringify({
        concept: logo.concept,
        marks: logo.marks.map((m) => ({ label: m.label, image_url: m.image_url })),
      }),
      clientPayload: { kind: "logo", logo },
    };
  }

  if (name === "generate_kit") {
    const kit = await generateKit({ context, activity: tc.activity });
    return {
      context, proposedNames: state.proposedNames,
      output: JSON.stringify({ kit }),
      clientPayload: { kind: "kit", kit },
      done: true,
    };
  }

  return {
    context, proposedNames: state.proposedNames,
    output: JSON.stringify({ error: `Unknown tool: "${name}".` }),
  };
}
