// Phase -1 · Category research — the step a studio does before it writes
// strategy, let alone draws.
//
// This is the one genuinely agentic step in the pipeline. Unlike the fixed
// strategy → design → critique sequence, research is open-ended: the model
// decides what to search for, follows what it finds, and stops when it has
// enough. So it runs as a real tool loop over Claude's server-side web search
// rather than as a single scripted call.
//
// It also OWNS the decisions the client delegated in Step 2 ("Let AI choose").
// Those arrive as an explicit assignment and come back as concrete
// recommendations — real hex values, real font families — grounded in what the
// category actually looks like rather than picked off a preset list.

import Anthropic from "@anthropic-ai/sdk";

export interface CompetitorNote {
  name: string;
  identity: string; // what their mark/identity actually does, visually
}

export interface ResearchRecommendation {
  value: string; // e.g. "#1F2A22, #5C7A4F, …" or "Fraunces / Inter"
  rationale: string; // why, tied to a finding
}

export interface CategoryResearch {
  category: string; // the competitive set as the model understands it
  landscape: string; // 2-3 sentences on the category's visual conventions
  competitors: CompetitorNote[];
  saturated: string[]; // moves that are overused HERE — feeds anti-cliché
  whitespace: string[]; // differentiation opportunities
  // Present only for decisions the client delegated in Step 2.
  recommended_direction?: ResearchRecommendation | null;
  recommended_palette?: ResearchRecommendation | null;
  recommended_typography?: ResearchRecommendation | null;
  sources: string[]; // URLs actually consulted
}

export interface ResearchBrief {
  brief: string;
  name?: string | null;
  audience?: string | null;
  competitors?: string | null;
  // Which Step 2 decisions the studio owns (from delegatedChoices()).
  delegated: { style: boolean; palette: boolean; font: boolean };
}

const MODEL = "claude-opus-4-8";
const MAX_CONTINUATIONS = 4; // guard the pause_turn resume loop

const SYSTEM = `You are the research director at Fluid, a brand studio operating
at the level of Pentagram or Wolff Olins. Before any strategy or design work
begins, you study the category the brand is entering.

Use web search to ground your findings in what is actually out there. Search
for the real competitive set, look at how those brands present themselves
visually, and find what the category's identity conventions are. Do not invent
competitors or describe logos you have not verified — if you are unsure what a
brand's mark looks like, say so or leave it out.

What you are looking for:
- The visual conventions of this category — what nearly everyone does.
- What is SATURATED: the specific moves so overused here that they now read as
  generic. Be concrete ("cold blue-to-teal gradients", "abstract connected
  nodes"), never vague ("boring logos").
- WHITESPACE: what almost nobody in this category is doing that would still
  suit this brand — the differentiation opportunity.

Be specific and useful. "The category is competitive" helps no one; "six of the
eight largest players use a lowercase geometric sans in navy, so a warm serif
would read as instantly different" is the kind of finding that changes a design.

Respond with ONLY a JSON object — no prose, no markdown fences:
{
  "category": "...",
  "landscape": "...",
  "competitors": [{"name": "...", "identity": "..."}],
  "saturated": ["..."],
  "whitespace": ["..."],
  "sources": ["https://..."]
}`;

// Delegated decisions get appended to the schema so they come back typed.
function delegatedSchemaLines(d: ResearchBrief["delegated"]): string {
  const parts: string[] = [];
  if (d.style) {
    parts.push(
      `  "recommended_direction": {"value": "<the visual direction you ` +
        `recommend, in a few words>", "rationale": "<why, tied to a finding>"}`,
    );
  }
  if (d.palette) {
    parts.push(
      `  "recommended_palette": {"value": "<5 real hex values, comma-separated, ` +
        `uppercase #RRGGBB>", "rationale": "<why, tied to a finding>"}`,
    );
  }
  if (d.font) {
    parts.push(
      `  "recommended_typography": {"value": "<Heading family / Body family — ` +
        `real families available on Google Fonts>", "rationale": "<why>"}`,
    );
  }
  return parts.join(",\n");
}

function buildUserPrompt(input: ResearchBrief): string {
  const lines = [`Brand brief: ${input.brief.trim()}`];
  const name = (input.name ?? "").trim();
  const audience = (input.audience ?? "").trim();
  const competitors = (input.competitors ?? "").trim();
  if (name) lines.push(`Brand name: ${name}`);
  if (audience) lines.push(`Target audience: ${audience}`);
  if (competitors) {
    lines.push(
      `Competitors the client named (start here, then find others): ${competitors}`,
    );
  }

  const d = input.delegated;
  if (d.style || d.palette || d.font) {
    lines.push(
      ``,
      `THE CLIENT HAS DELEGATED THESE DECISIONS TO THE STUDIO. Decide them`,
      `yourself, grounded in your research — you are NOT limited to any preset`,
      `list, and you must return concrete values, not descriptions of options:`,
    );
    if (d.style) lines.push(`- The visual direction.`);
    if (d.palette) lines.push(`- The colour palette (real hex values).`);
    if (d.font) lines.push(`- The typography (real Google Fonts families).`);
    lines.push(
      ``,
      `Include these extra keys in your JSON object:`,
      delegatedSchemaLines(d),
    );
  }

  lines.push(``, `Research the category and respond with the JSON object.`);
  return lines.join("\n");
}

function extractResearch(text: string, d: ResearchBrief["delegated"]): CategoryResearch {
  let raw = text.trim();
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) raw = fence[1].trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found in research response.");
  }
  const p = JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;

  const strArray = (v: unknown, cap: number): string[] =>
    (Array.isArray(v) ? v : [])
      .map((x) => String(x).trim())
      .filter(Boolean)
      .slice(0, cap);

  const rec = (v: unknown): ResearchRecommendation | null => {
    if (!v || typeof v !== "object") return null;
    const o = v as Record<string, unknown>;
    const value = String(o.value ?? "").trim();
    if (!value) return null;
    return { value, rationale: String(o.rationale ?? "").trim() };
  };

  const competitors: CompetitorNote[] = (
    Array.isArray(p.competitors) ? p.competitors : []
  )
    .map((c) => {
      const o = (c ?? {}) as Record<string, unknown>;
      return {
        name: String(o.name ?? "").trim(),
        identity: String(o.identity ?? "").trim(),
      };
    })
    .filter((c) => c.name)
    .slice(0, 8);

  return {
    category: String(p.category ?? "").trim(),
    landscape: String(p.landscape ?? "").trim(),
    competitors,
    saturated: strArray(p.saturated, 8),
    whitespace: strArray(p.whitespace, 6),
    recommended_direction: d.style ? rec(p.recommended_direction) : null,
    recommended_palette: d.palette ? rec(p.recommended_palette) : null,
    recommended_typography: d.font ? rec(p.recommended_typography) : null,
    sources: strArray(p.sources, 10),
  };
}

// Run the research agent. Loops on pause_turn so a long search session
// completes rather than returning half-finished.
//
// `budgetMs` bounds the loop in wall-clock time. A continuation cap alone
// doesn't: each round is an Opus call that may run eight searches with adaptive
// thinking, so five rounds can outlast the whole serverless function. When the
// budget runs out we stop searching and extract from what we have — partial
// research beats a killed request, and the caller degrades to none at all if
// the model never got as far as emitting its findings.
export async function researchCategory(
  input: ResearchBrief,
  budgetMs = 200_000,
): Promise<CategoryResearch> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured.");
  }
  const client = new Anthropic();
  const startedAt = Date.now();
  const outOfTime = () => Date.now() - startedAt > budgetMs;

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: buildUserPrompt(input) },
  ];
  const request = {
    model: MODEL,
    max_tokens: 8000,
    thinking: { type: "adaptive" as const },
    system: SYSTEM,
    tools: [
      { type: "web_search_20260209", name: "web_search", max_uses: 8 },
    ],
  } satisfies Omit<Anthropic.MessageCreateParamsNonStreaming, "messages">;

  let response = await client.messages.create({ ...request, messages });

  // Server-side tools run their own loop; when it hits the per-request cap the
  // turn pauses and we resume by echoing the assistant turn back.
  let continuations = 0;
  while (
    response.stop_reason === "pause_turn" &&
    continuations < MAX_CONTINUATIONS &&
    !outOfTime()
  ) {
    continuations += 1;
    messages.push({ role: "assistant", content: response.content });
    response = await client.messages.create({ ...request, messages });
  }
  if (response.stop_reason === "pause_turn") {
    console.warn(
      `[research] stopped mid-search after ${continuations} continuation(s), ${Date.now() - startedAt}ms`,
    );
  }

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  return extractResearch(text, input.delegated);
}

// Read cached research off a brand's data column, or null.
export function getResearch(data: unknown): CategoryResearch | null {
  const d = (data ?? {}) as Record<string, unknown>;
  const r = d.research as CategoryResearch | undefined;
  return r && r.landscape ? r : null;
}

// Format research for injection into downstream prompts. Everything the studio
// designs — strategy, marks, palette, type — should be answering this.
export function researchContext(data: unknown): string {
  const r = getResearch(data);
  if (!r) return "";
  const lines = [`Category research (ground your work in this):`];
  if (r.category) lines.push(`- Category: ${r.category}`);
  if (r.landscape) lines.push(`- Landscape: ${r.landscape}`);
  if (r.competitors.length) {
    lines.push(
      `- Competitor identities:`,
      ...r.competitors.map((c) => `  · ${c.name}: ${c.identity}`),
    );
  }
  if (r.saturated.length) {
    lines.push(
      `- SATURATED in this category — avoid these specifically:`,
      ...r.saturated.map((s) => `  · ${s}`),
    );
  }
  if (r.whitespace.length) {
    lines.push(
      `- Differentiation opportunities:`,
      ...r.whitespace.map((s) => `  · ${s}`),
    );
  }
  const recs: string[] = [];
  if (r.recommended_direction) {
    recs.push(`  · Visual direction: ${r.recommended_direction.value} — ${r.recommended_direction.rationale}`);
  }
  if (r.recommended_palette) {
    recs.push(`  · Palette: ${r.recommended_palette.value} — ${r.recommended_palette.rationale}`);
  }
  if (r.recommended_typography) {
    recs.push(`  · Typography: ${r.recommended_typography.value} — ${r.recommended_typography.rationale}`);
  }
  if (recs.length) {
    lines.push(
      `- The studio's decisions on what the client delegated (treat these as settled):`,
      ...recs,
    );
  }
  return lines.join("\n");
}
