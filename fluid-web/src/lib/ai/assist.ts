// Phase 3 · Inline AI assists for the wizard's "suggest" buttons.
// Small, fast single Claude calls behind one endpoint: rewrite the brief,
// suggest an audience or competitors, or pick the best option from a set.

import Anthropic from "@anthropic-ai/sdk";

export type AssistTask =
  | "brief_shorter"
  | "brief_punchier"
  | "brief_sharper"
  | "audience"
  | "competitors"
  | "pick_style"
  | "pick_palette"
  | "pick_font";

export interface AssistOption {
  id: string;
  label: string;
  desc?: string;
}

export interface AssistInput {
  task: AssistTask;
  brief: string;
  audience?: string | null;
  competitors?: string | null;
  options?: AssistOption[];
}

// Result is one of: { text } for rewrites/suggestions, { items } for
// competitors, { choice } for pick_* tasks.
export interface AssistResult {
  text?: string;
  items?: string[];
  choice?: string;
}

const MODEL = "claude-opus-4-8";

function firstText(response: Anthropic.Message): string {
  return response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

async function ask(system: string, user: string, maxTokens = 700): Promise<string> {
  const client = new Anthropic();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: user }],
  });
  return firstText(response);
}

const BRIEF_SYSTEM = `You are Fluid, a brand strategist helping refine a one-or-two
sentence brand brief. Rewrite the brief as instructed. Keep the meaning, keep it
to at most two sentences, and return ONLY the rewritten brief — no quotes, no
preamble, no explanation.`;

const BRIEF_INSTRUCTION: Record<string, string> = {
  brief_shorter: "Make it noticeably shorter and tighter without losing the core idea.",
  brief_punchier: "Make it punchier and more energetic — confident and vivid.",
  brief_sharper: "Sharpen the angle — make the positioning and point of difference clearer.",
};

export async function runAssist(input: AssistInput): Promise<AssistResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured.");
  }
  const brief = input.brief.trim();

  if (input.task === "brief_shorter" || input.task === "brief_punchier" || input.task === "brief_sharper") {
    const text = await ask(
      BRIEF_SYSTEM,
      `${BRIEF_INSTRUCTION[input.task]}\n\nBrief:\n${brief}`,
    );
    return { text: text.replace(/^["']|["']$/g, "").trim() };
  }

  if (input.task === "audience") {
    const text = await ask(
      `You are Fluid, a brand strategist. Given a brand brief, describe the
target audience in one or two crisp sentences (who they are, their context,
what they already use). Return ONLY that description — no preamble.`,
      `Brief:\n${brief}`,
    );
    return { text: text.replace(/^["']|["']$/g, "").trim() };
  }

  if (input.task === "competitors") {
    const raw = await ask(
      `You are Fluid, a brand strategist. Given a brand brief, list 3 real,
plausible competitor or adjacent brand names. Return ONLY a JSON array of
short strings (just the names), no prose, no code fences.`,
      `Brief:\n${brief}${input.competitors ? `\n\nAlready listed (don't repeat): ${input.competitors}` : ""}`,
    );
    let items: string[] = [];
    try {
      const start = raw.indexOf("[");
      const end = raw.lastIndexOf("]");
      const parsed = JSON.parse(raw.slice(start, end + 1));
      if (Array.isArray(parsed)) {
        items = parsed.map((x) => String(x).trim()).filter(Boolean).slice(0, 3);
      }
    } catch {
      items = raw.split(/[,\n]/).map((s) => s.replace(/^[-*\d.\s]+/, "").trim()).filter(Boolean).slice(0, 3);
    }
    return { items };
  }

  // pick_* — choose the best option id from the provided set.
  const options = input.options ?? [];
  if (options.length === 0) return { choice: "" };
  const kind =
    input.task === "pick_style" ? "visual style direction"
    : input.task === "pick_palette" ? "color palette"
    : "typography pairing";
  const list = options
    .map((o) => `- ${o.id}: ${o.label}${o.desc ? ` — ${o.desc}` : ""}`)
    .join("\n");
  const raw = await ask(
    `You are Fluid, a brand designer. Choose the single best ${kind} for the
brand from the given options. Return ONLY the exact id of your choice — nothing
else.`,
    `Brief:\n${brief}${input.audience ? `\nAudience: ${input.audience}` : ""}\n\nOptions:\n${list}`,
    120,
  );
  const chosen = raw.trim().replace(/^["'`]|["'`]$/g, "");
  const match = options.find((o) => o.id === chosen)
    || options.find((o) => chosen.includes(o.id))
    || options[0];
  return { choice: match.id };
}
