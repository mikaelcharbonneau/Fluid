// Phase -1 · Category research — the step a studio does before it writes
// strategy, let alone draws.
//
// This is the one genuinely agentic step in the pipeline. Unlike the fixed
// strategy → design → critique sequence, research is open-ended: the model
// decides what to search for, follows what it finds, and stops when it has
// enough. So it runs as a real tool loop over Claude's server-side web search
// rather than as a single scripted call.
//
// Two things it is FOR:
//  1. Finding what's actually current in logo design right now — real trends
//     and treatments the model can point to, not a static list.
//  2. Deciding what visual style, palette, and typography actually SUIT this
//     brand and its category — but only for the decisions the client
//     delegated in Step 2 ("Let AI choose"). Those arrive as an explicit
//     assignment and come back as concrete recommendations grounded in
//     research, not picked off a preset list.
//
// One thing it is explicitly NOT for: treating a shared category convention as
// a problem to route around. If most players in a category use the same
// visual language, that is usually evidence the language fits the category —
// not proof the category is "saturated". The research separates genuine
// suitability from stale execution instead of defaulting to differentiation.

import Anthropic from "@anthropic-ai/sdk";

export interface CompetitorNote {
  name: string;
  identity: string; // what their mark/identity actually does, visually
}

export interface ResearchRecommendation {
  value: string; // e.g. "#1F2A22, #5C7A4F, …" or "Fraunces / Inter"
  rationale: string; // why, tied to a finding
}

export interface ConventionNote {
  pattern: string; // the shared visual move, stated concretely
  note: string; // is this a genuine fit for the category, or just tired execution — and why
}

export interface CategoryResearch {
  category: string; // the competitive set as the model understands it
  landscape: string; // 2-3 sentences on the category's visual conventions
  competitors: CompetitorNote[];
  conventions: ConventionNote[]; // shared visual moves in this category, each judged on fit vs. staleness
  trends: string[]; // current logo design trends/styles relevant to this brief, from research
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

const MODEL = "claude-sonnet-5";

// Cost and latency controls. These are the tuning knobs for this step — raise
// EFFORT first if the findings ever come back thin.
//
// `effort` matters more here than anything else: it defaults to `high` on
// Sonnet 5, and this model reaches for tools readily, so at the default it
// deliberated between every single search and ran for minutes. Research reads
// search results and fills in a fixed schema; it is not reasoning-heavy work.
const EFFORT = "low";
const SEARCH_USES = 5; // per round
const MAX_SEARCH_ROUNDS = 2; // initial call + at most one pause_turn resume
const MIN_CALL_MS = 20_000; // don't start a call we can't plausibly finish

const SYSTEM = `You are the research director at Fluid, a brand studio operating
at the level of Pentagram or Wolff Olins. Before any strategy or design work
begins, you study the category the brand is entering and what's actually
current in logo design right now.

Use web search to ground your findings in what is actually out there. Search
for the real competitive set, look at how those brands present themselves
visually, and search separately for current logo design trends and styles
(recent identity work, design-award coverage, trend reports) — not just this
one category's competitors. Do not invent competitors or describe logos you
have not verified — if you are unsure what a brand's mark looks like, say so
or leave it out.

What you are looking for:
- The visual conventions of this category — what nearly everyone does, and
  concretely what that looks like.
- For each convention: is it a genuine fit, or just tired execution? A shared
  visual language across a category is usually evidence that language WORKS
  for that category — navy and a restrained geometric sans across banks isn't
  "saturation", it's what trust and restraint look like in finance. Only flag
  a convention as stale when the execution itself has gone generic (a specific
  treatment every competitor now uses the same tired way), never merely
  because it's common. Do not default to recommending differentiation for its
  own sake — recommend it only when it's a better answer than the convention.
- Current logo design trends and styles worth knowing about for this brief —
  from research, not assumption. Note which (if any) genuinely suit this
  brand versus which are just current.

Be specific and useful. "The category is competitive" helps no one; "six of
the eight largest players use a lowercase geometric sans in navy — this fits
finance's need to signal restraint and trust, not a rut to escape" is the kind
of finding that changes a design.

Work quickly and search sparingly — a handful of well-chosen searches, not an
exhaustive survey. Two or three broad searches usually cover both the
competitive set and current trends. Stop searching as soon as you can answer
every field below, and write up your findings immediately; a fast, grounded
answer is worth far more here than a complete one that arrives too late.

Respond with ONLY a JSON object — no prose, no markdown fences:
{
  "category": "...",
  "landscape": "...",
  "competitors": [{"name": "...", "identity": "..."}],
  "conventions": [{"pattern": "...", "note": "..."}],
  "trends": ["..."],
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
      `THE CLIENT HAS DELEGATED THESE DECISIONS TO THE STUDIO. Decide what is`,
      `most SUITABLE for this brand and category — grounded in your research,`,
      `not limited to any preset list. "Suitable" can mean confidently using a`,
      `strong category convention if it genuinely fits this brand, or drawing`,
      `on a current trend if that fits better — you are not obligated to`,
      `differentiate for its own sake. Return concrete values, not descriptions`,
      `of options:`,
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

  const conventions: ConventionNote[] = (
    Array.isArray(p.conventions) ? p.conventions : []
  )
    .map((c) => {
      const o = (c ?? {}) as Record<string, unknown>;
      return {
        pattern: String(o.pattern ?? "").trim(),
        note: String(o.note ?? "").trim(),
      };
    })
    .filter((c) => c.pattern)
    .slice(0, 8);

  return {
    category: String(p.category ?? "").trim(),
    landscape: String(p.landscape ?? "").trim(),
    competitors,
    conventions,
    trends: strArray(p.trends, 6),
    recommended_direction: d.style ? rec(p.recommended_direction) : null,
    recommended_palette: d.palette ? rec(p.recommended_palette) : null,
    recommended_typography: d.font ? rec(p.recommended_typography) : null,
    sources: strArray(p.sources, 10),
  };
}

function textOf(response: Anthropic.Message): string {
  return response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}

function looksLikeJson(text: string): boolean {
  const raw = text.replace(/```(?:json)?/gi, "");
  const start = raw.indexOf("{");
  return start !== -1 && raw.lastIndexOf("}") > start;
}

// Run the research agent. Loops on pause_turn so a long search session
// completes rather than returning half-finished.
//
// `budgetMs` is a HARD deadline, enforced by passing the remaining time as the
// per-request timeout. Checking the clock between rounds is not enough on its
// own: the SDK defaults to a 10-minute timeout with 2 retries, so a single
// slow call can block for ~30 minutes — far longer than the whole serverless
// function — and no between-rounds check can interrupt it. That is exactly how
// this step used to overrun its budget into negative time.
export async function researchCategory(
  input: ResearchBrief,
  budgetMs = 120_000,
): Promise<CategoryResearch> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured.");
  }
  // No retries. The SDK retries timed-out requests, so wall clock can reach
  // timeout × (retries + 1) — leaving retries on would let a call overrun the
  // deadline by a multiple no matter what timeout we set. Research already
  // degrades gracefully to "none" if it fails, and the caller keeps going, so
  // a predictable deadline is worth more here than one more attempt.
  const client = new Anthropic({ maxRetries: 0 });

  const startedAt = Date.now();
  const remainingMs = () => budgetMs - (Date.now() - startedAt);

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: buildUserPrompt(input) },
  ];
  // The search tool stays declared on every call, including the finalize call
  // below: once web_search_tool_result blocks are in the history, the request
  // that replays them has to declare the tool that produced them.
  const request = {
    model: MODEL,
    max_tokens: 8000,
    thinking: { type: "adaptive" as const },
    output_config: { effort: EFFORT },
    system: SYSTEM,
    tools: [
      { type: "web_search_20260209", name: "web_search", max_uses: SEARCH_USES },
    ],
  } satisfies Omit<Anthropic.MessageCreateParamsNonStreaming, "messages">;

  const call = (msgs: Anthropic.MessageParam[]) =>
    client.messages.create(
      { ...request, messages: msgs },
      { timeout: Math.max(MIN_CALL_MS, remainingMs()) },
    );

  let response = await call(messages);

  // Server-side tools run their own loop; when it hits the per-request cap the
  // turn pauses and we resume by echoing the assistant turn back.
  let rounds = 1;
  while (
    response.stop_reason === "pause_turn" &&
    rounds < MAX_SEARCH_ROUNDS &&
    remainingMs() > MIN_CALL_MS
  ) {
    rounds += 1;
    messages.push({ role: "assistant", content: response.content });
    response = await call(messages);
  }

  let text = textOf(response);

  // The searching is the expensive part, and it all lives in `messages` by
  // now. If the loop stopped before Claude wrote up its findings we used to
  // throw the entire run away with "No JSON object found" — so ask once more,
  // cheaply, for the write-up alone.
  if (!looksLikeJson(text)) {
    console.warn(
      `[research] no findings after ${rounds} round(s), ${Date.now() - startedAt}ms — asking for the write-up`,
    );
    messages.push({ role: "assistant", content: response.content });
    messages.push({
      role: "user",
      content:
        "Stop searching. Using only what you have already found, respond now " +
        "with ONLY the JSON object described in your instructions.",
    });
    text = textOf(await call(messages));
  }

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
  if (r.conventions.length) {
    lines.push(
      `- Category conventions (judge fit, don't default to avoiding — shared`,
      `  language is often evidence it suits the category):`,
      ...r.conventions.map((c) => `  · ${c.pattern} — ${c.note}`),
    );
  }
  if (r.trends.length) {
    lines.push(
      `- Current logo design trends relevant to this brief:`,
      ...r.trends.map((s) => `  · ${s}`),
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
