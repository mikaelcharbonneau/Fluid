// Phase 2 · Convergence — high-fidelity finalists from the liked sketches.
//
// Three-stage studio process:
//   1. REFINE: each liked croquis is developed into a finished vector mark —
//      same underlying geometry, now with proper construction, optical
//      correction, and the brand's palette.
//   2. EXPAND: new concepts extending the user's demonstrated taste (the liked
//      sketches' territories + formal attributes) top the pool up PAST 9 —
//      we deliberately overproduce so the critique has something to cull.
//   3. CRITIQUE: a creative-director pass scores every candidate against the
//      studio rubric, kills the weak, and returns the best 9 with verdicts.
//
// Generation is chunked into parallel calls of ≤4 marks each to keep individual
// responses fast and reliable.

import Anthropic from "@anthropic-ai/sdk";
import { renderLogoImage } from "./images";
import type { CreativePlatform } from "./platform";
import type { LogoSketch } from "./sketches";
import { type LogoConfig, logoConfigContext } from "../logo-styles";
import {
  MARK_TYPES,
  DESIGN_PRINCIPLES,
  ANTI_CLICHE,
  CRITIQUE_RUBRIC,
} from "./design";

export interface LogoFinalist {
  id: string;
  name: string;
  territory: string;
  mark_type: string;
  idea: string; // designer's rationale
  critique: string; // creative director's verdict note
  score: number; // 0–100 from the critique pass
  refines: string | null; // name of the source concept, or null if new
  art: string; // the art direction that produced the image
  image_url: string; // rendered PNG in Supabase storage
  svg?: string; // filled in later, when the client vectorizes their pick
  vector_url?: string;
}

export interface RefineBrief {
  brandId: string;
  brief: string;
  name?: string | null;
  platform: CreativePlatform;
  liked: LogoSketch[]; // ≥1
  styleContext?: string | null;
  config?: LogoConfig | null; // the client's Step 4 brief
  paletteColors?: string[] | null; // brand hexes for the finished marks
}

const MODEL = "claude-opus-4-8";
const FINAL_COUNT = 9;
const POOL_TARGET = 11; // overproduce so the critique can cull
const CHUNK = 4; // marks per generation call

const DESIGNER_SYSTEM = `You are a senior identity designer at Fluid, a brand
studio operating at the level of Pentagram or Wolff Olins. You are in the
CONVERGENCE phase: producing finished, high-fidelity vector marks.

${MARK_TYPES}

${DESIGN_PRINCIPLES}

${ANTI_CLICHE}

Your marks will be judged by the creative director against this rubric:
${CRITIQUE_RUBRIC}

Output EXACTLY this format for each mark, nothing else — no prose, no code
fences:

===CONCEPT===
NAME: <concept name>
TYPE: <one mark-type key>
REFINES: <name of the concept this develops, or NEW>
IDEA: <one sentence: the concept and the idea it expresses>
ART: <a precise art-direction brief for the finished mark: exact forms, their
arrangement, proportion, stroke weight, and colour (use the brand colours by
hex). Write it so an illustrator could execute it exactly. Describe ONLY the
mark — never the background, framing, or rendering style.>`;

function platformLines(p: CreativePlatform): string[] {
  return [
    `Creative platform:`,
    `- Brand idea: ${p.brand_idea}`,
    p.personality.length ? `- Personality: ${p.personality.join(", ")}` : "",
    p.design_notes ? `- Design notes: ${p.design_notes}` : "",
  ].filter(Boolean);
}

function commonContext(input: RefineBrief): string[] {
  const lines = [
    `Brand brief: ${input.brief.trim()}`,
    input.name?.trim() ? `Brand name: ${input.name.trim()}` : "",
    ``,
    ...platformLines(input.platform),
  ];
  // The client's Step 4 brief is mandatory — it constrains the finished marks
  // exactly as it constrained the sketches.
  const configCtx = logoConfigContext(input.config ?? {});
  if (configCtx) {
    lines.push(``, `THE CLIENT'S BRIEF — these choices are mandatory:`, configCtx);
  }
  const palette = (input.paletteColors ?? []).filter(Boolean);
  if (palette.length) {
    lines.push(``, `Brand colors (use purposefully — 1 or 2 per mark): ${palette.join(", ")}`);
  }
  const ctx = (input.styleContext ?? "").trim();
  if (ctx) lines.push(``, `The user's design choices so far:`, ctx);
  return lines.filter((l) => l !== null && l !== undefined);
}

function tasteProfile(liked: LogoSketch[]): string[] {
  return [
    ``,
    `The client's chosen directions (their demonstrated taste):`,
    ...liked.map(
      (s) =>
        `- "${s.name}" [${s.territory_name} / ${s.mark_type}; ${s.attributes.join(", ")}]: ${s.idea}`,
    ),
  ];
}

function buildRefinePrompt(input: RefineBrief, chunk: LogoSketch[]): string {
  const lines = [
    ...commonContext(input),
    ...tasteProfile(input.liked),
    ``,
    `YOUR TASK: develop each of the following ${chunk.length} approved sketches`,
    `into a finished mark. Stay faithful to each sketch's core geometry and`,
    `idea — this is a refinement, not a re-invention. Apply proper`,
    `construction, optical correction, and the brand colors.`,
    ``,
    ...chunk.flatMap((s) => [
      `CONCEPT "${s.name}" (${s.mark_type}; territory: ${s.territory_name}) — ${s.idea}`,
      `Its art direction: ${s.art}`,
      ``,
    ]),
    `Produce ${chunk.length} marks in the required format, with REFINES set to`,
    `the exact sketch name each one develops.`,
  ];
  return lines.join("\n");
}

function buildExpandPrompt(input: RefineBrief, count: number): string {
  const lines = [
    ...commonContext(input),
    ...tasteProfile(input.liked),
    ``,
    `YOUR TASK: design ${count} NEW finished marks that EXTEND the client's`,
    `demonstrated taste — same territories and formal qualities, genuinely new`,
    `ideas (not variations of the approved sketches). Set REFINES: NEW.`,
    ``,
    `Produce ${count} marks in the required format.`,
  ];
  return lines.join("\n");
}

const CRITIC_SYSTEM = `You are the creative director of Fluid, a brand studio
operating at the level of Pentagram or Wolff Olins. Your designers have
produced candidate marks; your job is the cull. Judge each candidate honestly
and rank them.

${CRITIQUE_RUBRIC}

${ANTI_CLICHE}

Respond with ONLY a JSON array, best candidate first, one entry per candidate:
[{"name": "<exact candidate name>", "score": <0-100>, "note": "<one-sentence
designer's verdict: what works, what to watch>"}]
Include EVERY candidate. No prose, no code fences.`;

interface Verdict {
  name: string;
  score: number;
  note: string;
}

function extractVerdicts(text: string): Verdict[] {
  let raw = text.trim();
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) raw = fence[1].trim();
  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) return [];
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1)) as unknown[];
    return parsed
      .map((v) => {
        const o = (v ?? {}) as Record<string, unknown>;
        const score = Math.round(Number(o.score));
        return {
          name: String(o.name ?? "").trim(),
          score: Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : 50,
          note: String(o.note ?? "").trim(),
        };
      })
      .filter((v) => v.name);
  } catch {
    return [];
  }
}

interface Candidate {
  name: string;
  territory: string;
  mark_type: string;
  idea: string;
  refines: string | null;
  art: string;
}

function extractCandidates(text: string, fallbackTerritory: string): Candidate[] {
  const raw = text.replace(/```[a-z]*\n?|```/gi, "").trim();
  const segments = raw.split(/===\s*CONCEPT\s*===/i).map((s) => s.trim()).filter(Boolean);
  const out: Candidate[] = [];
  for (const seg of segments) {
    const art = seg.match(/ART:\s*([\s\S]+?)(?=\n[A-Z]{3,}:|$)/i)?.[1]?.trim() ?? "";
    if (!art) continue;
    const refinesRaw = seg.match(/REFINES:\s*(.+)/i)?.[1]?.trim() ?? "NEW";
    out.push({
      name: seg.match(/NAME:\s*(.+)/i)?.[1]?.trim() || "Concept",
      territory: fallbackTerritory,
      mark_type:
        seg.match(/TYPE:\s*(.+)/i)?.[1]?.trim().toLowerCase() ?? "abstract",
      idea: seg.match(/IDEA:\s*(.+)/i)?.[1]?.trim() ?? "",
      refines: /^new$/i.test(refinesRaw) ? null : refinesRaw,
      art,
    });
  }
  return out;
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export async function generateLogoFinalists(
  input: RefineBrief,
): Promise<LogoFinalist[]> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured.");
  }
  if (input.liked.length === 0) {
    throw new Error("At least one liked sketch is required.");
  }
  const client = new Anthropic();
  const defaultTerritory = input.liked[0].territory;

  const call = async (system: string, prompt: string, maxTokens: number) => {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      thinking: { type: "adaptive" },
      system,
      messages: [{ role: "user", content: prompt }],
    });
    return response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");
  };

  // 1+2. Refine all liked sketches + expand the pool past 9, all in parallel,
  // chunked so no single call produces more than CHUNK marks.
  const expandCount = Math.max(0, POOL_TARGET - input.liked.length);
  const jobs: Promise<Candidate[]>[] = [
    ...chunk(input.liked, CHUNK).map(async (group) => {
      const text = await call(
        DESIGNER_SYSTEM,
        buildRefinePrompt(input, group),
        12000,
      );
      const cands = extractCandidates(text, defaultTerritory);
      // Carry territory/type metadata over from the source sketch when traceable.
      return cands.map((c) => {
        const src = group.find(
          (s) => s.name.toLowerCase() === (c.refines ?? "").toLowerCase(),
        );
        return src
          ? { ...c, territory: src.territory, mark_type: c.mark_type || src.mark_type }
          : c;
      });
    }),
    ...chunk(Array.from({ length: expandCount }), CHUNK).map(async (group) => {
      const text = await call(
        DESIGNER_SYSTEM,
        buildExpandPrompt(input, group.length),
        12000,
      );
      return extractCandidates(text, defaultTerritory);
    }),
  ];

  const settled = await Promise.allSettled(jobs);
  const pool: Candidate[] = [];
  const seen = new Set<string>();
  for (const result of settled) {
    if (result.status !== "fulfilled") continue;
    for (const c of result.value) {
      let name = c.name;
      let suffix = 2;
      while (seen.has(name.toLowerCase())) name = `${c.name} ${suffix++}`;
      seen.add(name.toLowerCase());
      pool.push({ ...c, name });
    }
  }
  if (pool.length === 0) {
    const firstError = settled.find(
      (r): r is PromiseRejectedResult => r.status === "rejected",
    );
    if (firstError) throw firstError.reason;
    throw new Error("The studio returned no usable marks.");
  }

  // 3. Creative-director critique: score, cull, rank. If the critique call
  // fails we degrade gracefully — return the pool uncritiqued rather than
  // losing the user's paid generation.
  let verdicts: Verdict[] = [];
  try {
    const critiquePrompt = [
      ...commonContext(input),
      ``,
      `CANDIDATES (${pool.length}):`,
      ...pool.flatMap((c, i) => [
        ``,
        `#${i + 1} "${c.name}" (${c.mark_type}${c.refines ? `; develops client-approved concept "${c.refines}"` : "; new exploration"}) — ${c.idea}`,
        `Art direction: ${c.art}`,
      ]),
      ``,
      `Score and rank every candidate as a JSON array.`,
    ].join("\n");
    verdicts = extractVerdicts(await call(CRITIC_SYSTEM, critiquePrompt, 3000));
  } catch {
    verdicts = [];
  }

  const verdictFor = new Map(verdicts.map((v) => [v.name.toLowerCase(), v]));
  const ranked = [...pool].sort((a, b) => {
    const va = verdictFor.get(a.name.toLowerCase())?.score ?? 50;
    const vb = verdictFor.get(b.name.toLowerCase())?.score ?? 50;
    return vb - va;
  });

  // Render the survivors in parallel at high quality. One failed render drops
  // that mark rather than losing the whole (paid) board.
  const rendered = await Promise.allSettled(
    ranked.slice(0, FINAL_COUNT).map(async (c, i) => {
      const id = `fin_${Date.now().toString(36)}_${i + 1}`;
      const img = await renderLogoImage({
        brandId: input.brandId,
        phase: "final",
        slot: id,
        direction: c.art,
        quality: "high",
      });
      const v = verdictFor.get(c.name.toLowerCase());
      return {
        id,
        name: c.name,
        territory: c.territory,
        mark_type: c.mark_type,
        idea: c.idea,
        critique: v?.note ?? "",
        score: v?.score ?? 50,
        refines: c.refines,
        art: c.art,
        image_url: img.url,
      } as LogoFinalist;
    }),
  );

  const finalists = rendered
    .filter((r): r is PromiseFulfilledResult<LogoFinalist> => r.status === "fulfilled")
    .map((r) => r.value);
  if (finalists.length === 0) {
    const firstError = rendered.find(
      (r): r is PromiseRejectedResult => r.status === "rejected",
    );
    if (firstError) throw firstError.reason;
    throw new Error("The studio could not render any finished marks.");
  }
  return finalists;
}
