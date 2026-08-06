// Phase 2 · Convergence — high-fidelity finalists from ONE chosen concept.
//
// Two-stage studio process:
//   1. REFINE: the chosen croquis is developed into the requested number of
//      finished marks — same underlying geometry, now with proper
//      construction, optical correction, and the colours the client specified
//      for each version. Versions are different resolutions of one idea, never
//      new ideas.
//   2. CRITIQUE: a creative-director pass scores each mark against the studio
//      rubric and ranks them, attaching the verdict shown on every card.
//
// Two stages have been removed on the way here, and both removals were the
// same lesson. There was an EXPAND stage that invented marks alongside the
// client's picks so a critique could cull down to a final set — so liking one concept
// bought eight marks nobody chose. Then refinement still developed every liked
// concept at once, which is divergence in convergence's clothing. It now takes
// a single concept and a brief, and draws exactly what was asked for.
//
// One call produces all the versions (there are at most MAX_REFINE_VERSIONS of
// them), which keeps them aware of each other and genuinely distinct.

import { fetchImageBytes, renderLogoImage } from "./images";
import { generateOpenAIText } from "./openai";
import type { Clock } from "./budget";
import type { CreativePlatform } from "./platform";
import type { BoardSketch } from "./sketch-board";
import { type LogoConfig, logoConfigContext } from "../logo-styles";
import type { RefineVersion } from "../logo-refine";
import { silentActivity, type Activity } from "./activity";
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
  version: number; // which requested version this mark answers, 1-based
  colors: string[]; // the colours the client specified for that version
  image_url: string; // rendered PNG in Supabase storage
  svg?: string; // filled in later, when the client vectorizes their pick
  vector_url?: string;
}

/**
 * A sketch that can be developed into a finalist.
 *
 * Concepts only ever come off the board now — the wizard's own logo step became
 * this same studio, and the older Phase-1 sketch shape went with it. The alias
 * stays because "what refinement can develop" is a different idea from "what
 * the board draws", even while they are the same shape.
 */
export type RefinableSketch = BoardSketch;

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
  concept_id: string; // the one concept this plan develops
  versions: RefineVersion[]; // the brief it was designed against
  pool: Candidate[];
  verdicts: Verdict[];
}

/**
 * Bumped whenever what belongs in a plan changes.
 *
 * v1 plans were a pool of 11 that was mostly marks the client never picked.
 * v2 plans developed every liked concept, before the brief narrowed to one
 * concept with colours chosen per version. v3 plans described the chosen
 * sketch in text but did not use it as the image-edit source. Resuming any of
 * them would render something the client did not ask for, so an older plan is
 * discarded and the marks are designed again.
 */
export const PLAN_VERSION = 4;

export interface RefineBrief {
  brandId: string;
  brief: string;
  name?: string | null;
  platform: CreativePlatform;
  concept: RefinableSketch; // the single concept being developed
  versions: RefineVersion[]; // 1..MAX_REFINE_VERSIONS, each with its colours
  styleContext?: string | null;
  config?: LogoConfig | null; // the client's Step 4 brief
  clock?: Clock | null; // phase timing, so the slow step shows up in the logs
  activity?: Activity | null; // running commentary for the client
  // A plan from an earlier attempt that ran out of time. Present means the
  // design stages are skipped and this run goes straight to rendering.
  plan?: FinalistPlan | null;
  // Called once the design stages finish, so the caller can cache the plan
  // before the risky part starts.
  onPlan?: (plan: FinalistPlan) => Promise<void> | void;
}

// Refinement must leave the majority of the route's budget for image rendering.
// These two calls only plan and assess a few marks, so low reasoning and tight
// output budgets keep them from starving the operation that the user sees.
const DESIGN_CALL_TIMEOUT_MS = 70_000;
// The critique call already degrades gracefully on any failure (caught below,
// marks ship unranked) — a shorter budget is fine here and leaves more of the
// clock for rendering.
const CRITIQUE_CALL_TIMEOUT_MS = 25_000;
const FINAL_RENDER_TIMEOUT_MS = 160_000;

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
VERSION: <the version number this mark answers>
TYPE: <one mark-type key>
REFINES: <name of the concept this develops, or NEW>
IDEA: <one sentence: the concept and the idea it expresses>
ART: <a precise finish specification for the selected sketch: its existing
silhouette and construction must remain intact; state only the optical cleanup,
stroke treatment, and the exact hex colours for each existing element. Do not
invent, replace, add, remove, rotate, or rearrange forms.>`;

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
  // Colours are deliberately NOT stated here. The client sets them per version,
  // so a shared "brand colours" line would either duplicate or contradict the
  // per-version instruction, and a contradiction is how a mark comes back in a
  // colour nobody asked for.
  const ctx = (input.styleContext ?? "").trim();
  if (ctx) lines.push(``, `The user's design choices so far:`, ctx);
  return lines.filter((l) => l !== null && l !== undefined);
}

function conceptProfile(s: RefinableSketch): string[] {
  return [
    ``,
    `THE CONCEPT THE CLIENT CHOSE — this is the only idea in play:`,
    `- "${s.name}" [${[s.style_name, s.territory_name, s.mark_type]
      .filter(Boolean)
      .join(" / ")}; ${s.attributes.join(", ")}]: ${s.idea}`,
    `Its art direction as sketched: ${s.art}`,
  ];
}

function buildRefinePrompt(input: RefineBrief): string {
  const s = input.concept;
  const total = input.versions.length;
  const lines = [
    ...commonContext(input),
    ...conceptProfile(s),
    ``,
    `YOUR TASK: develop that one concept into ${total} finished`,
    `mark${total === 1 ? "" : "s"}. This is a refinement, not a re-invention.`,
    `The supplied sketch is the mandatory design master: preserve its outer`,
    `silhouette, all internal negative spaces, stroke paths, proportions,`,
    `orientation, and element relationships. Apply only construction cleanup`,
    `and optical correction to those existing forms.`,
    ``,
    // A concept was chosen from a board where every sketch sat in one named
    // style world, so the world is part of what the client picked. Polishing a
    // brutalist mark into a refined one answers a brief they did not give.
    s.style_name
      ? `The concept was drawn in the ${s.style_name} style world. Finish it inside that world.`
      : `Finish the concept inside the style world it was drawn in.`,
    `Construction quality goes up; the world does not move — a brutalist mark`,
    `becomes a better brutalist mark, blunt and heavy, not a smoothed one.`,
    `"Finished" means resolved, not polite.`,
    ``,
  ];

  if (total > 1) {
    // Without this the versions come back as one drawing in several colourways,
    // which is not a choice. Colour is the client's decision; the differences
    // the studio is being paid for are structural.
    lines.push(
      `Every version must remain recognizably the SAME selected logo. Versions`,
      `may vary only in optical cleanup, controlled stroke finishing, and the`,
      `client-provided palette. Never change the silhouette, counter-shapes,`,
      `connections, or arrangement of the source sketch.`,
      ``,
    );
  }

  lines.push(
    `The client has specified the colours for each version. Use exactly these`,
    `— no others, no tints or shades that are not listed — and say in the ART`,
    `which element takes which hex. Where a version lists more than one colour,`,
    `the first is the primary.`,
    ``,
    ...input.versions.flatMap((v, i) => [
      `VERSION ${i + 1} — colours: ${v.colors.join(", ")}${
        v.colors.length === 1 ? " (a single-colour mark)" : ""
      }`,
    ]),
    ``,
    `Produce exactly ${total} mark${total === 1 ? "" : "s"} in the required`,
    `format, one per version, with VERSION set to its number and REFINES set to`,
    `"${s.name}". Give each version its own NAME.`,
  );
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
  version: number; // 1-based; which requested version this mark answers
  colors: string[]; // the colours that version asked for
}

function extractCandidates(text: string, fallbackTerritory: string): Candidate[] {
  const raw = text.replace(/```[a-z]*\n?|```/gi, "").trim();
  const segments = raw.split(/===\s*CONCEPT\s*===/i).map((s) => s.trim()).filter(Boolean);
  const out: Candidate[] = [];
  for (const seg of segments) {
    const art = seg.match(/ART:\s*([\s\S]+?)(?=\n[A-Z]{3,}:|$)/i)?.[1]?.trim() ?? "";
    if (!art) continue;
    const refinesRaw = seg.match(/REFINES:\s*(.+)/i)?.[1]?.trim() ?? "NEW";
    const versionRaw = Number(seg.match(/VERSION:\s*(\d+)/i)?.[1]);
    out.push({
      name: seg.match(/NAME:\s*(.+)/i)?.[1]?.trim() || "Concept",
      territory: fallbackTerritory,
      mark_type:
        seg.match(/TYPE:\s*(.+)/i)?.[1]?.trim().toLowerCase() ?? "abstract",
      idea: seg.match(/IDEA:\s*(.+)/i)?.[1]?.trim() ?? "",
      refines: /^new$/i.test(refinesRaw) ? null : refinesRaw,
      art,
      // Filled in by the caller, which knows what was actually asked for.
      version: Number.isFinite(versionRaw) ? versionRaw : 0,
      colors: [],
    });
  }
  return out;
}

function sourceLockedRenderDirection(input: RefineBrief, candidate: Candidate): string {
  return [
    `The supplied image is the client-selected source sketch and is mandatory.`,
    `Refine that exact logo into a finished vector-style mark. Preserve its outer`,
    `silhouette, internal negative spaces, stroke paths, proportions, orientation,`,
    `and every relationship between elements. Do not invent a new letterform or`,
    `symbol, and do not add, remove, rotate, split, merge, or rearrange any forms.`,
    `Clean only the existing geometry: smooth intentional curves, regularize`,
    `stroke endings, balance the existing spacing, and remove sketch texture.`,
    `Use exactly these colours on the existing forms: ${candidate.colors.join(", ")}.`,
    `The selected sketch's intended direction: ${input.concept.idea}`,
  ].join("\n");
}

export async function generateLogoFinalists(
  input: RefineBrief,
): Promise<LogoFinalist[]> {
  if (!input.concept) {
    throw new Error("A concept is required.");
  }
  if (input.versions.length === 0) {
    throw new Error("At least one version is required.");
  }
  const defaultTerritory = input.concept.territory;
  const activity = input.activity ?? silentActivity;

  const call = async (
    system: string,
    prompt: string,
    maxTokens: number,
    timeoutMs: number,
    acceptPartial = false,
  ) => {
    return generateOpenAIText({
      instructions: system,
      input: prompt,
      maxOutputTokens: maxTokens,
      reasoningEffort: "low",
      timeoutMs,
      acceptPartial,
    });
  };

  // Both stages are text, and together they were overrunning the budget before
  // rendering could start — which is why the result is cached before the
  // renders begin.
  const design = async (): Promise<FinalistPlan> => {
    // 1. Develop the chosen concept into the requested versions. One call: at
    // most MAX_REFINE_VERSIONS marks, and they have to differ from each other,
    // which only works if one response writes them all.
    //
    // Reasoning models charge thinking against max_output_tokens; 5k was too
    // tight for multi-version art direction and hit the output-token ceiling.
    const designing = activity.phase(
      `Drawing ${input.versions.length} version${input.versions.length === 1 ? "" : "s"} of "${input.concept.name}"`,
    );
    const text = await call(
      DESIGNER_SYSTEM,
      buildRefinePrompt(input),
      32_000,
      DESIGN_CALL_TIMEOUT_MS,
      true,
    );
    designing();
    input.clock?.lap("refine");

    const pool: Candidate[] = [];
    const seen = new Set<string>();
    const parsed = extractCandidates(text, defaultTerritory);
    for (const [i, c] of parsed.entries()) {
      // Trust the stated version when it names one we asked for; otherwise fall
      // back to the order it came in. Either way the colours attached are the
      // ones the client specified, never whatever the model wrote in the ART.
      const stated = c.version >= 1 && c.version <= input.versions.length ? c.version : 0;
      const version = stated || Math.min(i + 1, input.versions.length);
      let name = c.name;
      let suffix = 2;
      while (seen.has(name.toLowerCase())) name = `${c.name} ${suffix++}`;
      seen.add(name.toLowerCase());
      pool.push({
        ...c,
        name,
        version,
        colors: input.versions[version - 1].colors,
        territory: input.concept.territory,
        mark_type: c.mark_type || input.concept.mark_type,
        refines: input.concept.name,
      });
    }
    if (pool.length === 0) {
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
      const judging = activity.phase("Creative-director critique");
      verdicts = extractVerdicts(
        await call(CRITIC_SYSTEM, critiquePrompt, 1_500, CRITIQUE_CALL_TIMEOUT_MS),
      );
      judging();
      for (const v of verdicts) {
        activity.emit("note", `${v.score}/100 — ${v.name}: ${v.note}`);
      }
    } catch {
      verdicts = [];
      activity.emit("warn", "The critique failed — the marks are unranked but intact");
    }
    input.clock?.lap("critique");

    return {
      v: PLAN_VERSION,
      concept_id: input.concept.id,
      versions: input.versions,
      pool,
      verdicts,
    };
  };

  // A cached plan means an earlier attempt designed these marks and then ran
  // out of time rendering them. The thinking is already paid for, so resume
  // from it — this is what makes "trying again resumes from there" true.
  let plan = input.plan?.pool?.length ? input.plan : null;
  if (plan) {
    activity.emit("note", `Reusing ${plan.pool.length} designed marks from the cached plan`);
    input.clock?.lap("resumed from cached plan");
  } else {
    plan = await design();
    // Hand it back for caching before the timeout-prone part starts.
    await input.onPlan?.(plan);
  }
  const { pool, verdicts } = plan;

  const verdictFor = new Map(verdicts.map((v) => [v.name.toLowerCase(), v]));

  // Presented in the order the client asked for them, not in the critique's
  // preferred order. They numbered the versions and chose each one's colours,
  // so version 2 should be the second card; the critique's opinion belongs in
  // the note on the card, not in a reshuffle of their brief.
  const ordered = [...pool].sort((a, b) => a.version - b.version);

  // Render in parallel at high quality. One failed render drops that mark
  // rather than losing the whole (paid) set.
  //
  // A resumed run starts the clock fresh with the design work already cached,
  // so it reaches this guard with the whole budget intact — which is the point
  // of caching the plan.
  input.clock?.guard("render the finished marks", FINAL_RENDER_TIMEOUT_MS + 15_000);
  activity.emit("note", "Using the selected sketch as the source for every refined version");
  const sourceSketch = await fetchImageBytes(input.concept.image_url);
  const drawing = activity.phase(`Rendering ${Math.min(ordered.length, input.versions.length)} finished marks`);
  const rendered = await Promise.allSettled(
    ordered.slice(0, input.versions.length).map(async (c, i) => {
      const id = `fin_${Date.now().toString(36)}_${i + 1}`;
      const img = await renderLogoImage({
        brandId: input.brandId,
        phase: "final",
        slot: id,
        direction: sourceLockedRenderDirection(input, c),
        // These are the candidate refinements the client compares before
        // vectorization, so medium avoids high-quality image latency without
        // compromising the mark's construction or the selected colourway.
        quality: "medium",
        timeoutMs: FINAL_RENDER_TIMEOUT_MS,
        referenceImage: sourceSketch,
        onPrompt: (prompt, model) =>
          activity.emit(
            "prompt",
            `Rendering version ${c.version} — "${c.name}" (${model})`,
            prompt,
          ),
      });
      activity.emit("note", `Rendered version ${c.version} — "${c.name}"`);
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
        version: c.version,
        colors: c.colors,
        image_url: img.url,
      } as LogoFinalist;
    }),
  );

  drawing();
  const finalists = rendered
    .filter((r): r is PromiseFulfilledResult<LogoFinalist> => r.status === "fulfilled")
    .map((r) => r.value);
  for (const r of rendered) {
    if (r.status === "rejected") {
      activity.emit(
        "warn",
        "A mark failed to render and was dropped",
        r.reason instanceof Error ? r.reason.message : String(r.reason),
      );
    }
  }
  if (finalists.length === 0) {
    const firstError = rendered.find(
      (r): r is PromiseRejectedResult => r.status === "rejected",
    );
    if (firstError) throw firstError.reason;
    throw new Error("The studio could not render any finished marks.");
  }
  return finalists;
}
