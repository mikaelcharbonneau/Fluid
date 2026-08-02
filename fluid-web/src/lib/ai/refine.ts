// Phase 2 · Convergence — high-fidelity finalists from the liked sketches.
//
// Two-stage studio process:
//   1. REFINE: every liked croquis is developed into finished vector marks —
//      same underlying geometry, now with proper construction, optical
//      correction, and the brand's palette. A concept drawn more than once
//      comes back as different resolutions of that idea, never a new one.
//   2. CRITIQUE: a creative-director pass scores each mark against the studio
//      rubric and ranks them, attaching the verdict shown on every card.
//
// There used to be an EXPAND stage between them, inventing marks alongside the
// client's picks so the critique could cull down to nine. It was the wrong
// trade twice over: someone who liked one concept got eight marks they never
// chose, and the invention was most of the work that pushed this route past
// its deadline. Refinement now only resolves what was actually picked, so
// nothing is culled and nothing is invented.
//
// Generation is chunked into parallel calls of ≤4 marks each to keep individual
// responses fast and reliable.

import Anthropic from "@anthropic-ai/sdk";
import { renderLogoImage } from "./images";
import type { Clock } from "./budget";
import type { CreativePlatform } from "./platform";
import type { LogoSketch } from "./sketches";
import { type LogoConfig, logoConfigContext } from "../logo-styles";
import { refinedMarkCount } from "../logo-board";
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

/**
 * A sketch that can be developed into a finalist.
 *
 * Board concepts carry the style world they were drawn in; the older Phase-1
 * sketches do not. Optional rather than required so both flows fit, and so a
 * brand part-way through the old flow still refines.
 */
export type RefinableSketch = LogoSketch & {
  style_id?: string | null;
  style_name?: string | null;
};

/**
 * Everything the design stages produce, before a single pixel is rendered.
 *
 * Thinking up the marks and rendering them are both slow, and together they
 * overran the function's budget. The plan is cached the moment the critique
 * lands, so a run that dies during rendering resumes from here instead of
 * paying for the same thinking twice.
 */
export interface FinalistPlan {
  v: number; // composition version — see PLAN_VERSION
  liked_ids: string[]; // the picks this plan was designed from
  pool: Candidate[];
  verdicts: Verdict[];
}

/**
 * Bumped whenever what belongs in a plan changes.
 *
 * v1 plans were a pool of 11 that was mostly marks the client never picked, so
 * resuming one would render the very thing this stage stopped producing. A
 * plan from an older version is discarded and redesigned rather than reused.
 */
export const PLAN_VERSION = 2;

export interface RefineBrief {
  brandId: string;
  brief: string;
  name?: string | null;
  platform: CreativePlatform;
  liked: RefinableSketch[]; // ≥1
  styleContext?: string | null;
  config?: LogoConfig | null; // the client's Step 4 brief
  paletteColors?: string[] | null; // brand hexes for the finished marks
  clock?: Clock | null; // phase timing, so the slow step shows up in the logs
  // A plan from an earlier attempt that ran out of time. Present means the
  // design stages are skipped and this run goes straight to rendering.
  plan?: FinalistPlan | null;
  // Called once the design stages finish, so the caller can cache the plan
  // before the risky part starts.
  onPlan?: (plan: FinalistPlan) => Promise<void> | void;
}

const MODEL = "claude-opus-4-8";
const CHUNK = 4; // marks per generation call

/**
 * Spread the finished marks across the liked concepts.
 *
 * Every pick gets developed at least once — a mark the client chose is never
 * dropped to hit the target — so liking more than REFINED_MARK_COUNT concepts
 * widens the set rather than culling it. Remainders go to the earliest picks.
 */
export function planVariants(likedCount: number): number[] {
  if (likedCount <= 0) return [];
  const total = refinedMarkCount(likedCount);
  const base = Math.floor(total / likedCount);
  const extra = total % likedCount;
  return Array.from({ length: likedCount }, (_, i) => base + (i < extra ? 1 : 0));
}

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

function tasteProfile(liked: RefinableSketch[]): string[] {
  return [
    ``,
    `The client's chosen directions (their demonstrated taste):`,
    ...liked.map(
      (s) =>
        `- "${s.name}" [${[s.style_name, s.territory_name, s.mark_type]
          .filter(Boolean)
          .join(" / ")}; ${s.attributes.join(", ")}]: ${s.idea}`,
    ),
  ];
}

// The style worlds the client actually picked from, in the order they appear.
/** A liked sketch and how many finished resolutions of it to draw. */
interface VariantJob {
  sketch: RefinableSketch;
  count: number;
}

function buildRefinePrompt(input: RefineBrief, chunk: VariantJob[]): string {
  const total = chunk.reduce((n, j) => n + j.count, 0);
  const lines = [
    ...commonContext(input),
    ...tasteProfile(input.liked),
    ``,
    `YOUR TASK: develop the approved sketches below into ${total} finished`,
    `mark${total === 1 ? "" : "s"}. Stay faithful to each sketch's core geometry`,
    `and idea — this is a refinement, not a re-invention. Apply proper`,
    `construction, optical correction, and the brand colors.`,
    ``,
    // A concept was chosen from a board where every sketch sat in one named
    // style world, so the world is part of what the client picked. Polishing a
    // brutalist mark into a refined one answers a brief they did not give.
    `Each concept below names the STYLE WORLD it was drawn in. Finish it inside`,
    `that world. Construction quality goes up; the world does not move — a`,
    `brutalist mark becomes a better brutalist mark, blunt and heavy, not a`,
    `smoothed one. "Finished" means resolved, not polite.`,
    ``,
    // The client asked for their concept, so every mark here develops one. When
    // a concept is drawn more than once the copies must differ in resolution —
    // otherwise the extra slots come back as the same mark and the choice at
    // the end is not a choice.
    `Where a concept is to be drawn more than once, each version must be a`,
    `genuinely different RESOLUTION of that same idea — vary the construction,`,
    `weight, proportion, counter-shapes or how the elements are joined. Never a`,
    `new idea, never a recolour of the same drawing. Someone comparing them`,
    `should see one concept resolved several convincing ways.`,
    ``,
    ...chunk.flatMap((j) => [
      `CONCEPT "${j.sketch.name}" (${[
        j.sketch.style_name ? `style world: ${j.sketch.style_name}` : "",
        j.sketch.mark_type,
        `territory: ${j.sketch.territory_name}`,
      ]
        .filter(Boolean)
        .join("; ")}) — ${j.sketch.idea}`,
      `Its art direction: ${j.sketch.art}`,
      `Draw ${j.count} version${j.count === 1 ? "" : "s"} of this concept.`,
      ``,
    ]),
    `Produce ${total} marks in the required format, with REFINES set to the`,
    `exact sketch name each one develops. Give each version its own NAME.`,
  ];
  return lines.join("\n");
}

const CRITIC_SYSTEM = `You are the creative director of Fluid, a brand studio
operating at the level of Pentagram or Wolff Olins. Your designers have
resolved the client's chosen concepts several ways. Every one of these marks
is going to the client, so your job is not the cull — it is to rank them
honestly and say what you see. Judge each candidate on its own merits.

${CRITIQUE_RUBRIC}

${ANTI_CLICHE}

Respond with ONLY a JSON array, best candidate first, one entry per candidate:
[{"name": "<exact candidate name>", "score": <0-100>, "note": "<one-sentence
designer's verdict: what works, what to watch>"}]
Include EVERY candidate. No prose, no code fences.`;

export interface Verdict {
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

export interface Candidate {
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

/**
 * Split the work so no single call has to produce more than `size` marks.
 *
 * Groups are measured in marks, not concepts: one concept asked for four ways
 * is a full call on its own, and a concept needing more than `size` versions is
 * split across calls rather than overloading one response.
 */
function chunkJobs(jobs: VariantJob[], size: number): VariantJob[][] {
  const out: VariantJob[][] = [];
  let group: VariantJob[] = [];
  let used = 0;
  for (const job of jobs) {
    let left = job.count;
    while (left > 0) {
      if (used === size) {
        out.push(group);
        group = [];
        used = 0;
      }
      const take = Math.min(left, size - used);
      group.push({ sketch: job.sketch, count: take });
      used += take;
      left -= take;
    }
  }
  if (group.length) out.push(group);
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
  const likedIds = input.liked.map((s) => s.id);

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

  // Stages 1–3: think up the marks and rank them. Everything here is text, and
  // together it was overrunning the budget before rendering could start.
  const design = async (): Promise<FinalistPlan> => {
    // 1. Develop the liked concepts, and nothing else. Every finished mark
    // resolves a concept the client actually chose — the studio no longer
    // invents marks alongside them, which is what the client was asking for
    // and what made this stage slow enough to miss the deadline.
    const variants = planVariants(input.liked.length);
    const work: VariantJob[] = input.liked.map((sketch, i) => ({
      sketch,
      count: variants[i],
    }));
    const jobs = chunkJobs(work, CHUNK).map(async (group) => {
      const text = await call(
        DESIGNER_SYSTEM,
        buildRefinePrompt(input, group),
        12000,
      );
      const cands = extractCandidates(text, defaultTerritory);
      // Carry territory/type metadata over from the source sketch when traceable.
      return cands.map((c) => {
        const src = group.find(
          (j) => j.sketch.name.toLowerCase() === (c.refines ?? "").toLowerCase(),
        );
        return src
          ? {
              ...c,
              territory: src.sketch.territory,
              mark_type: c.mark_type || src.sketch.mark_type,
            }
          : c;
      });
    });

    const settled = await Promise.allSettled(jobs);
    input.clock?.lap("refine");
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

    // 2. Creative-director critique: score and rank. Nothing is culled any
    // more — every mark develops a concept the client chose, so throwing one
    // away would be discarding their pick. What this pass is for now is the
    // ordering and the verdict note on each card. If it fails we degrade
    // gracefully and return the marks unranked rather than losing them.
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
    input.clock?.lap("critique");

    return { v: PLAN_VERSION, liked_ids: likedIds, pool, verdicts };
  };

  // A cached plan means an earlier attempt designed these marks and then ran
  // out of time rendering them. The thinking is already paid for, so resume
  // from it — this is what makes "trying again resumes from there" true.
  let plan = input.plan?.pool?.length ? input.plan : null;
  if (plan) {
    input.clock?.lap("resumed from cached plan");
  } else {
    plan = await design();
    // Hand it back for caching before the timeout-prone part starts.
    await input.onPlan?.(plan);
  }
  const { pool, verdicts } = plan;

  const verdictFor = new Map(verdicts.map((v) => [v.name.toLowerCase(), v]));
  const ranked = [...pool].sort((a, b) => {
    const va = verdictFor.get(a.name.toLowerCase())?.score ?? 50;
    const vb = verdictFor.get(b.name.toLowerCase())?.score ?? 50;
    return vb - va;
  });

  // Sized from the picks, not from a fixed 9: slicing to a constant would drop
  // a concept the client chose whenever they liked more than the target.
  const targetCount = refinedMarkCount(input.liked.length);

  // Render the survivors in parallel at high quality. One failed render drops
  // that mark rather than losing the whole (paid) board.
  //
  // A resumed run starts the clock fresh with the design work already cached,
  // so it reaches this guard with the whole budget intact — which is the point
  // of caching the plan.
  input.clock?.guard("render the finished marks", 150_000);
  const rendered = await Promise.allSettled(
    ranked.slice(0, targetCount).map(async (c, i) => {
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
