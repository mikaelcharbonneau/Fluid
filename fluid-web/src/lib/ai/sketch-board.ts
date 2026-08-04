// Divergence — six pencil croquis in one press.
//
// The standalone logo flow shows the client a board, not a queue. Six concepts
// arrive together, each one drawn wholly inside a single (style world × mark
// type) pairing planned by logo-board.ts, so the board presents distinct
// directions to choose between rather than many shades of the same compromise.
//
// Shape of the work: ONE design call writes all six concepts (it needs to see
// the whole board to keep the directions genuinely different), then six renders
// run in parallel. A render that fails or hangs is dropped and the rest of the
// board still ships.
//
// Rendering is deliberately low fidelity: graphite on paper. The client is
// choosing an IDEA here, and a polished render invites them to judge an
// execution that does not exist yet.

import { renderLogoImage } from "./images";
import type { Clock } from "./budget";
import { silentActivity, type Activity } from "./activity";
import { generateOpenAIText } from "./openai";
import type { CreativePlatform } from "./platform";
import { BOARD_SIZE, type BoardSlot, slotStyleName, slotTypeName } from "../logo-board";
import { captionBrief } from "./caption-reference";
import { MARK_TYPES, DESIGN_PRINCIPLES, ANTI_CLICHE, CRITIQUE_RUBRIC } from "./design";

export interface BoardSketch {
  id: string;
  slot: number; // 1-based position on the board it was drawn for
  name: string; // concept name, e.g. "Ledger stripe"
  style_id: string | null; // the world it was drawn in; null = studio's call
  style_name: string;
  mark_type: string;
  mark_type_name: string;
  territory: string;
  territory_name: string;
  attributes: string[];
  idea: string; // one-line rationale
  art: string; // the art direction that produced the image
  image_url: string;
  /**
   * The liked reference whose design thinking this concept answers, by image
   * path. Null when the slot had no brief. Kept so a client can see which of
   * their picks produced what, and so refinement can trace it later.
   */
  reference_path: string | null;
}

export interface BoardBrief {
  brandId: string;
  brief: string;
  name?: string | null;
  platform: CreativePlatform;
  slots: BoardSlot[];
  styleContext?: string | null;
  instructions?: string | null; // the client's own written direction
  nameMeaning?: string | null; // what the name means / where it came from
  // Refinement read off the Step 4 gallery. Only axes the client's picks
  // actually agreed on are present; a missing axis means no view, not neutral.
  referenceTaste?: {
    axes: { axis: string; value: number; label: string; note: string }[];
  } | null;
  avoidNames?: string[] | null; // concepts already on the board — don't repeat
  clock?: Clock | null;
  activity?: Activity | null; // running commentary for the client
}

// api/generate/logo/board reserves at least 200s of its 280s clock budget
// before calling generateSketchBoard, which is this design call followed by
// six parallel renders (each already capped at 120s in images.ts). Bounded
// so a stuck design call fails clearly with time still left for those renders
// to run, instead of running out the SDK's 10-minute default on its own.
const DESIGN_TIMEOUT_MS = 150_000;

// Six concepts with an art-direction paragraph each is a long output; thinking
// is where the differentiation between slots actually happens.
const MAX_TOKENS = 16000;

// Croquis, so fidelity is not the point — but "low" mangles letterforms badly
// enough to break every wordmark on the board, which is most of what clients
// ask for. Medium is the floor at which type stays readable.
const RENDER_QUALITY = "medium" as const;

const SYSTEM = `You are a senior identity designer at Fluid, a brand studio
operating at the level of Pentagram or Wolff Olins. You are in the DIVERGENCE
phase: filling a sketch board with quick pencil concepts (croquis) for the
client to react to. These are thumbnails of IDEAS, not finished marks — the
client will pick the directions worth developing, so clarity of concept beats
beauty of render.

${MARK_TYPES}

${DESIGN_PRINCIPLES}

${ANTI_CLICHE}

Your sketches will later be judged against this rubric — design accordingly:
${CRITIQUE_RUBRIC}

THE BOARD IS THE POINT. Every slot names a style world and a mark type, and
that concept must live wholly inside them:
- NEVER blend two worlds into one concept. A slot marked ORGANIC is organic and
  nothing else; borrowing an EDITORIAL move into it destroys the comparison the
  board exists to offer.
- Two slots sharing a world and a type must still be two genuinely different
  ideas — a different subject, structure or move, not the same concept redrawn.
- Read every slot before writing any of them. Six concepts that overlap are a
  failure even when each is individually decent.

MOST SLOTS ALSO CARRY A DESIGN BRIEF read off a real mark the client liked.
That brief is the single most important input you get, because it is the only
one that says what makes a mark OWNABLE rather than merely correct.
- Answer the DEVICE. It names a class of move — a kind of thinking, not a
  shape. Apply that thinking to THIS brand's idea and let it produce a form
  nobody has drawn before.
- You are never shown the original mark and must not try to imagine it. The
  brief is the whole of what you get, and reconstructing a specific existing
  logo from it would be a failure, not a success.
- A concept that ignores its slot's device is a wasted slot, however good it is
  on its own terms.
- Where a slot has no brief, the strategy alone decides — and the bar for an
  ownable move is yours to meet unaided.

THE BAR. A mark whose whole idea is a stock metaphor for its category is a
failure: a checkmark for "done", a shield for "secure", a leaf for "green", a
figure with arms raised for "people". The same goes for a plain letterform with
nothing done to it — an initial set in a typeface is a placeholder, not a
lettermark. Every concept needs one specific move you could point at and
explain.

Output EXACTLY one block per slot, in slot order, nothing else — no prose, no
code fences, no commentary:

===CONCEPT===
SLOT: <slot number>
NAME: <short evocative concept name, 1-3 words>
TERRITORY: <one territory key from the creative platform>
TYPE: <one mark-type key>
ATTRS: <3-5 comma-separated formal attributes, e.g. geometric, quiet, structural>
IDEA: <one sentence: the concept and why it expresses the territory>
ART: <a precise art-direction brief describing the mark to be drawn: the exact
forms, their arrangement, proportion, weight and relative scale. Write it so an
illustrator could execute it without seeing your head. Describe ONLY the mark
itself — never the background, framing, medium, or rendering style.>`;

// The style and type guidance each appear once as a legend rather than being
// repeated on all six slots: the same text six times reads to the model as
// six separate instructions and wastes the budget that should go on making
// the concepts differ.
function legend(slots: readonly BoardSlot[]): string[] {
  const lines: string[] = [];

  const styles = new Map<string, string>();
  for (const slot of slots) {
    const key = slotStyleName(slot).toUpperCase();
    if (!styles.has(key)) {
      styles.set(
        key,
        slot.style?.guidance ??
          "The world is yours to choose. Pick the most ownable, strategically " +
            "appropriate direction for this brand rather than a category convention, " +
            "and commit to it fully for this concept.",
      );
    }
  }
  lines.push(``, `STYLE WORLDS in play:`);
  for (const [key, guidance] of styles) lines.push(`[${key}] ${guidance}`);

  const types = new Map<string, string>();
  for (const slot of slots) {
    const key = slotTypeName(slot).toUpperCase();
    if (!types.has(key)) {
      types.set(
        key,
        slot.markType?.guidance ??
          "The mark type is yours to choose. Name the type you chose in the TYPE " +
            "field and justify it by the brand idea rather than by habit — do not " +
            "default to an abstract symbol because it is the safest thing to draw.",
      );
    }
  }
  lines.push(``, `MARK TYPES in play:`);
  for (const [key, guidance] of types) lines.push(`[${key}] ${guidance}`);

  return lines;
}

function buildUserPrompt(input: BoardBrief): string {
  const p = input.platform;
  const lines = [
    `Brand brief: ${input.brief.trim()}`,
    input.name?.trim() ? `Brand name: ${input.name.trim()}` : "",
    // Where a name comes from is the most useful thing a designer can know
    // about a wordmark, and it is the one thing no other field carries.
    input.nameMeaning?.trim()
      ? `What the name means: ${input.nameMeaning.trim()}`
      : "",
    ``,
    `Creative platform:`,
    `- Brand idea: ${p.brand_idea}`,
    p.personality.length ? `- Personality: ${p.personality.join(", ")}` : "",
    p.design_notes ? `- Design notes: ${p.design_notes}` : "",
    ``,
    `Territories (use these keys in the TERRITORY field):`,
    ...p.territories.map((t) => `- ${t.key} — ${t.name}: ${t.description}`),
  ];

  lines.push(...legend(input.slots));

  if (input.slots.some((slot) => slot.markType?.id === "combination")) {
    const name = input.name?.trim() || "the brand name";
    const initial = input.name?.trim().slice(0, 1).toUpperCase() || "the initial";
    lines.push(
      ``,
      `COMBINATION MARK CONSTRUCTION:`,
      `Every combination-mark slot must pair a fresh, ownable symbol with the wordmark “${name}”.`,
      `The symbol may use the initial “${initial}” only when that creates a specific visual device; an initial in an ordinary typeface is not a concept.`,
      `Design the symbol and wordmark as a deliberate lockup: define their relationship, spacing, baseline, scale, and shared visual logic in ART.`,
      `For each liked reference, transfer only its stated visual principles into an original mark for this brand. Never copy, trace, imitate, or reconstruct the reference’s composition, silhouette, or distinctive letterforms.`,
    );
  }

  // Design briefs, read off the marks the client liked. Numbered and listed
  // once, then referenced per slot: one reference usually covers two slots,
  // and repeating a paragraph reads to the model as two separate instructions.
  const briefIds = new Map<string, string>();
  const briefLines: string[] = [];
  for (const slot of input.slots) {
    const ref = slot.reference;
    if (!ref || briefIds.has(ref.imagePath)) continue;
    const id = `B${briefIds.size + 1}`;
    briefIds.set(ref.imagePath, id);
    briefLines.push(`[${id}] ${captionBrief(ref.caption)}`);
  }
  if (briefLines.length) {
    lines.push(
      ``,
      `DESIGN BRIEFS — each was read off a mark this client liked. They describe`,
      `HOW a mark works, never which mark it was. Answer the thinking; do not`,
      `try to picture the original:`,
      ...briefLines,
    );
  }

  lines.push(``, `THE BOARD — ${input.slots.length} slots:`);
  for (const slot of input.slots) {
    const id = slot.reference ? briefIds.get(slot.reference.imagePath) : null;
    lines.push(
      `${slot.index}. ${slotStyleName(slot).toUpperCase()} · ${slotTypeName(slot).toUpperCase()}` +
        (id ? ` · answering ${id}` : ` · no brief — strategy alone`),
    );
  }

  const ctx = (input.styleContext ?? "").trim();
  if (ctx) lines.push(``, `The client's design choices so far:`, ctx);

  const extra = (input.instructions ?? "").trim();
  if (extra) {
    lines.push(``, `The client's own direction (honor this closely):`, extra.slice(0, 1000));
  }

  // Refinement inferred from the reference gallery. Word AND number: the word
  // is what the drawing has to answer to, the number gives it a degree.
  //
  // Axes the client's picks disagreed on are absent by design — silence means
  // "no view", and must not be read as "balanced".
  const taste = input.referenceTaste;
  if (taste && taste.axes.length) {
    lines.push(
      ``,
      `Liking and rejecting real marks, the client landed here — these are the`,
      `refinement dials they set by choosing, without being asked directly:`,
      ...taste.axes.map(
        (a) => `- ${a.axis}: ${a.label} (${a.value.toFixed(2)}) — ${a.note}.`,
      ),
      `Hold these across every concept. They tune HOW a mark is drawn; the`,
      `strategy still decides WHAT it is, and each slot's world still sets the`,
      `frame. Any axis not listed is one they showed no preference on — treat`,
      `it as free, not as neutral.`,
    );
  }

  const avoid = (input.avoidNames ?? []).filter(Boolean);
  if (avoid.length) {
    lines.push(
      ``,
      `Concepts already on this client's board — do NOT repeat these ideas:`,
      avoid.join(", ") + ".",
    );
  }

  lines.push(``, `Draw all ${input.slots.length} concepts in the required format.`);
  return lines.filter(Boolean).join("\n");
}

// Exactly what generateSketchBoard would send, assembled without sending it.
//
// Prompt work is the substance of this feature and it is otherwise invisible:
// the only way to judge whether a caption actually reached the designer, or
// whether a slot's brief reads the way it was meant to, is to read the prompt.
// Doing that by spending three tokens and waiting two minutes per look makes
// iterating on wording prohibitively slow, so this returns the same strings the
// real call would use and costs nothing.
export function previewBoardPrompt(input: BoardBrief): {
  system: string;
  user: string;
  model: string;
} {
  return { system: SYSTEM, user: buildUserPrompt(input), model: process.env.OPENAI_TEXT_MODEL?.trim() || "gpt-5" };
}

export interface ParsedConcept {
  slot: number | null;
  name: string;
  territory: string;
  type: string;
  attributes: string[];
  idea: string;
  art: string;
}

export function parseConcepts(text: string): ParsedConcept[] {
  const raw = text.replace(/```[a-z]*\n?|```/gi, "").trim();
  const segments = raw
    .split(/===\s*CONCEPT\s*===/i)
    .map((s) => s.trim())
    .filter(Boolean);

  const out: ParsedConcept[] = [];
  for (const seg of segments) {
    // ART runs to the end of the block, so it is matched last-field style.
    const art = seg.match(/ART:\s*([\s\S]+?)(?=\n[A-Z]{3,}:|$)/i)?.[1]?.trim() ?? "";
    if (!art) continue;
    const slotRaw = seg.match(/SLOT:\s*(\d+)/i)?.[1];
    out.push({
      slot: slotRaw ? Number(slotRaw) : null,
      name: seg.match(/NAME:\s*(.+)/i)?.[1]?.trim() ?? "Concept",
      territory: seg.match(/TERRITORY:\s*(.+)/i)?.[1]?.trim() ?? "",
      type: seg.match(/TYPE:\s*(.+)/i)?.[1]?.trim().toLowerCase() ?? "",
      attributes: (seg.match(/ATTRS:\s*(.+)/i)?.[1] ?? "")
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean),
      idea: seg.match(/IDEA:\s*(.+)/i)?.[1]?.trim() ?? "",
      art,
    });
  }
  return out;
}

// Match each parsed concept back to the slot it was written for.
//
// The SLOT field is trusted when it names a real slot that nothing has claimed
// yet; otherwise the concept falls into the next free slot in order. A model
// that drops or renumbers a block should cost the board one slot's metadata,
// not the whole press.
export function assignToSlots(
  parsed: readonly ParsedConcept[],
  slots: readonly BoardSlot[],
): { slot: BoardSlot; concept: ParsedConcept }[] {
  const byIndex = new Map(slots.map((s) => [s.index, s]));
  const taken = new Set<number>();
  const paired: { slot: BoardSlot; concept: ParsedConcept }[] = [];
  const unplaced: ParsedConcept[] = [];

  for (const concept of parsed) {
    const slot = concept.slot !== null ? byIndex.get(concept.slot) : undefined;
    if (slot && !taken.has(slot.index)) {
      taken.add(slot.index);
      paired.push({ slot, concept });
    } else {
      unplaced.push(concept);
    }
  }

  const free = slots.filter((s) => !taken.has(s.index));
  unplaced.forEach((concept, i) => {
    const slot = free[i];
    if (slot) paired.push({ slot, concept });
  });

  paired.sort((a, b) => a.slot.index - b.slot.index);
  return paired;
}

export async function generateSketchBoard(input: BoardBrief): Promise<BoardSketch[]> {
  const activity = input.activity ?? silentActivity;

  const designed = activity.phase(`Designing ${input.slots.length} concepts`);
  const text = await generateOpenAIText({
    instructions: SYSTEM,
    input: buildUserPrompt(input),
    maxOutputTokens: MAX_TOKENS,
    reasoningEffort: "high",
    timeoutMs: DESIGN_TIMEOUT_MS,
  });
  designed();
  input.clock?.lap("design");

  const paired = assignToSlots(parseConcepts(text), input.slots);
  if (paired.length === 0) {
    throw new Error("The studio returned no usable concepts.");
  }
  activity.emit(
    "note",
    `${paired.length} concepts designed`,
    paired.map(({ slot, concept }) => `${slot.index}. ${concept.name} — ${concept.idea}`).join("\n"),
  );

  // A shared stamp keeps ids unique across presses while staying readable in
  // the storage paths (<brandId>/board/<stamp>-<slot>.png).
  const stamp = Date.now().toString(36);
  const territoryName = (key: string) =>
    input.platform.territories.find((t) => t.key === key)?.name ?? key;

  // All six renders at once. Each has its own timeout inside renderLogoImage,
  // so one stuck request is dropped rather than stalling the board.
  const drawing = activity.phase(`Rendering ${paired.length} sketches`);
  const rendered = await Promise.allSettled(
    paired.map(async ({ slot, concept }) => {
      const id = `sk_${stamp}_${slot.index}`;
      const img = await renderLogoImage({
        brandId: input.brandId,
        phase: "board",
        slot: `${stamp}-${slot.index}`,
        direction: concept.art,
        quality: RENDER_QUALITY,
        render: "pencil",
        onPrompt: (prompt, model) =>
          activity.emit(
            "prompt",
            `Rendering "${concept.name}" (${model})`,
            prompt,
          ),
      });
      activity.emit("note", `Drew "${concept.name}"`);
      const sketch: BoardSketch = {
        id,
        slot: slot.index,
        name: concept.name,
        style_id: slot.style?.id ?? null,
        style_name: slotStyleName(slot),
        // The slot's type outranks whatever the model labelled the concept —
        // it is what the client asked for, and it drives later targeting.
        mark_type: slot.markType?.id ?? concept.type ?? "abstract",
        mark_type_name: slotTypeName(slot),
        territory: concept.territory,
        territory_name: territoryName(concept.territory),
        attributes: concept.attributes,
        idea: concept.idea,
        art: concept.art,
        image_url: img.url,
        reference_path: slot.reference?.imagePath ?? null,
      };
      return sketch;
    }),
  );
  drawing();
  input.clock?.lap("render");

  const sketches: BoardSketch[] = [];
  for (const result of rendered) {
    if (result.status === "fulfilled") sketches.push(result.value);
    else {
      console.error("A board sketch failed to render:", result.reason);
      activity.emit(
        "warn",
        "A sketch failed to render and was dropped",
        result.reason instanceof Error ? result.reason.message : String(result.reason),
      );
    }
  }
  if (sketches.length === 0) {
    throw new Error("Every sketch failed to render. Please try again.");
  }
  return sketches;
}

export { BOARD_SIZE };
