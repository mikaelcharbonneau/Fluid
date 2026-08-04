// The six-up sketch board: which style world and which mark type each concept
// belongs to.
//
// One press draws six sketches. They are NOT six variations of one idea, and
// they are NOT hybrids of everything the client chose — each concept lives
// wholly inside ONE (style world × mark type) pairing, so the board reads as
// distinct directions that can be compared side by side: two organic
// wordmarks, two editorial wordmarks, two luxury lettermarks, and so on.
//
// Blending is the failure mode this file exists to prevent. Asked for "organic
// and editorial", a model will happily produce six concepts that are each a
// bit of both — which shows the client nothing, because there is nothing to
// choose between.

import {
  fixedMarkType,
  standaloneStyleById,
  type MarkTypeOption,
  type StandaloneStyleOption,
} from "./logo-styles";
import type { ReferenceCaption } from "./ai/caption-reference";

export const BOARD_SIZE = 6;

/**
 * Likes are intentionally unbounded. The generator consumes them in ordered
 * BOARD_SIZE batches, so every saved reference can eventually lead a concept.
 */
/** A liked reference, reduced to what the board needs from it. */
export interface LikedReference {
  imagePath: string;
  caption: ReferenceCaption;
}

export interface BoardSlot {
  /** 1-based position on this board. Stable within one press. */
  index: number;
  /** null when the client delegated the world — the studio picks it. */
  style: StandaloneStyleOption | null;
  /** null when the client delegated the type. */
  markType: MarkTypeOption | null;
  /**
   * The liked reference whose design thinking this concept answers. Null when
   * the client liked nothing, or when nothing they liked is captioned yet.
   */
  reference: LikedReference | null;
}

// Resolve the client's selection into the distinct worlds actually in play.
// "Let Fluid choose" collapses to null (the studio decides), and an empty
// selection means the same thing — so a plan always has at least one entry.
function resolveStyles(ids: readonly string[]): (StandaloneStyleOption | null)[] {
  const out: (StandaloneStyleOption | null)[] = [];
  for (const id of ids) {
    const found = standaloneStyleById(id);
    const style = found && found.id !== "fluid-choice" ? found : null;
    if (!out.some((s) => (s?.id ?? null) === (style?.id ?? null))) out.push(style);
  }
  return out.length ? out : [null];
}

function resolveTypes(ids: readonly string[]): (MarkTypeOption | null)[] {
  const out: (MarkTypeOption | null)[] = [];
  for (const id of ids) {
    // fixedMarkType returns null for "Let AI Choose" as well as for an unknown
    // id — both mean the studio owns the decision.
    const type = fixedMarkType(id);
    if (!out.some((t) => (t?.id ?? null) === (type?.id ?? null))) out.push(type);
  }
  return out.length ? out : [null];
}

// Lay the board out.
//
// TWO INDEPENDENT DIMENSIONS have to be covered by the same six slots.
//
// Style × type comes from Steps 2 and 3 and is an explicit instruction, so
// pairings are laid out first, world-major: a world's concepts sit together,
// which is how a designer pins a board up and what makes the comparison easy
// to read. Six slots share out as evenly as the pairing count allows.
//
// Liked references are then dealt round-robin ACROSS that layout rather than
// grouped alongside it. Every liked reference is promised a sketch, and since
// references are consumed in ordered six-reference batches, every slot is
// led by one current reference. Dealing across rather than in blocks also
// means one reference's thinking gets tried against several style/type
// pairings when a smaller batch is available.
//
// A caption's device is deliberately written as a transferable class, not a
// recipe, which is what lets it survive being paired with a mark type its
// original had nothing to do with.
export function planBoard(
  styleIds: readonly string[],
  typeIds: readonly string[],
  references: readonly LikedReference[] = [],
  total = BOARD_SIZE,
): BoardSlot[] {
  const styles = resolveStyles(styleIds);
  const types = resolveTypes(typeIds);

  const pairings: { style: StandaloneStyleOption | null; markType: MarkTypeOption | null }[] = [];
  for (const style of styles) {
    for (const markType of types) pairings.push({ style, markType });
  }

  const base = Math.floor(total / pairings.length);
  const remainder = total % pairings.length;

  const slots: BoardSlot[] = [];
  pairings.forEach((pairing, i) => {
    const count = base + (i < remainder ? 1 : 0);
    for (let n = 0; n < count; n += 1) {
      slots.push({
        index: slots.length + 1,
        ...pairing,
        reference: references.length
          ? references[slots.length % references.length]
          : null,
      });
    }
  });
  return slots;
}

// How a slot is named on the card and in the prompt. "Studio's call" is shown
// rather than hidden: a client who delegated should see that they did.
export function slotStyleName(slot: BoardSlot): string {
  return slot.style?.name ?? "Fluid's choice";
}

export function slotTypeName(slot: BoardSlot): string {
  return slot.markType?.name ?? "Fluid's choice";
}

export interface BoardPlanSummary {
  styleName: string;
  typeName: string;
  count: number;
}

// The plan in words, for showing the client what a press will produce before
// they spend anything on it.
//
// Deliberately derived from planBoard rather than recomputed: the screen and
// the generator must agree, and the only way to guarantee that is for the
// screen to be reading the same plan the generator will run.
export function summariseBoardPlan(
  styleIds: readonly string[],
  typeIds: readonly string[],
  total = BOARD_SIZE,
): BoardPlanSummary[] {
  const out: BoardPlanSummary[] = [];
  for (const slot of planBoard(styleIds, typeIds, [], total)) {
    const styleName = slotStyleName(slot);
    const typeName = slotTypeName(slot);
    const last = out[out.length - 1];
    if (last && last.styleName === styleName && last.typeName === typeName) last.count += 1;
    else out.push({ styleName, typeName, count: 1 });
  }
  return out;
}
