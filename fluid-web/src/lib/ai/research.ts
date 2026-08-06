// Phase -1 · Category research — the step a studio does before it writes
// strategy, let alone draws.
//
// This is the one genuinely agentic step in the pipeline. Unlike the fixed
// strategy → design → critique sequence, research is open-ended: the model
// decides what to search for, follows what it finds, and stops when it has
// enough. So it runs through OpenAI's hosted web-search tool rather than a
// static, scripted category lookup.
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

const MODEL = "gpt-5";
const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

// Research reads search results and fills in a fixed schema; it is not
// reasoning-heavy work, so keep the model's reasoning effort low.
const EFFORT = "low";

type OpenAIOutputText = {
  type: "output_text";
  text: string;
  annotations?: Array<{ type?: string; url?: string }>;
};

type OpenAIResearchResponse = {
  status?: string;
  output_text?: string;
  error?: { message?: string } | null;
  incomplete_details?: { reason?: string } | null;
  output?: Array<{ content?: OpenAIOutputText[] }>;
};

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

function outputText(response: OpenAIResearchResponse): string {
  if (response.output_text?.trim()) return response.output_text;
  return (response.output ?? [])
    .flatMap((item) => item.content ?? [])
    .filter((item) => item.type === "output_text")
    .map((item) => item.text)
    .join("\n");
}

function citedUrls(response: OpenAIResearchResponse): string[] {
  const urls = new Set<string>();
  for (const item of response.output ?? []) {
    for (const content of item.content ?? []) {
      for (const annotation of content.annotations ?? []) {
        if (annotation.type === "url_citation" && annotation.url) {
          urls.add(annotation.url);
        }
      }
    }
  }
  return [...urls].slice(0, 10);
}

// OpenAI executes hosted web search within the Responses request, so no
// application-managed tool replay loop is necessary. Keep a hard deadline on
// that one network call; the durable job worker owns any retry policy.
export async function researchCategory(
  input: ResearchBrief,
  budgetMs = 120_000,
): Promise<CategoryResearch> {
  const apiKey = (process.env.OPENAI_API_KEY ?? "").trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    signal: AbortSignal.timeout(Math.max(1_000, budgetMs)),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      instructions: SYSTEM,
      input: buildUserPrompt(input),
      tools: [{ type: "web_search" }],
      reasoning: { effort: EFFORT },
      max_output_tokens: 4_000,
      text: { format: { type: "json_object" } },
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `OpenAI research failed (${response.status}): ${detail.slice(0, 300)}`,
    );
  }

  const payload = (await response.json()) as OpenAIResearchResponse;
  if (payload.status && payload.status !== "completed") {
    const detail = payload.error?.message ?? payload.incomplete_details?.reason;
    throw new Error(detail ?? `OpenAI research ended as ${payload.status}.`);
  }

  const research = extractResearch(outputText(payload), input.delegated);
  const sources = citedUrls(payload);
  return sources.length ? { ...research, sources } : research;
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
