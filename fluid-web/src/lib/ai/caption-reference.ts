// Captioning for the reference library — the design thinking behind a mark.
//
// The refinement axes describe how a mark is DRAWN. Captions describe how it
// WORKS. That difference is what the first real board exposed: concepts came
// back correctly weighted and correctly styled, and still generic, because
// nothing in the signal said what makes a mark ownable rather than competent.
//
// THE ALTITUDE PROBLEM is the whole design of this file. These are real
// third-party logos. A device written as a recipe —
//
//   "the crossbar of the A is removed so the letter reads as a mountain peak"
//
// turns the generator into a knockoff machine. The same observation written as
// a principle —
//
//   "meaning carried by an element that has been removed rather than added"
//
// is a brief. Same insight; only one of them is safe to hand to a generator,
// and only one of them transfers to a brand that has no A in its name.
//
// So the prompt does not ask for altitude and hope. It gives paired
// too-low/right examples, states the reconstruction test explicitly, and bans
// the brand name outright. Captions that fail the test are the failure mode
// worth watching for in any batch.

import { generateOpenAIText } from "./openai";

// Called many-at-a-time from a bounded worker pool (api/logo-references/tag)
// against a shared route-level deadline. A single vision call taking anywhere
// near this long would already be anomalous; bounding it here keeps one stuck
// call from quietly occupying a pool lane for the SDK's 10-minute default
// while the rest of the batch waits.
const CALL_TIMEOUT_MS = 60_000;

export interface ReferenceCaption {
  /** How the mark is constructed and drawn. Always present. */
  technique: string;
  /**
   * The single ownable move, as a class a designer could apply elsewhere.
   * Null when the mark genuinely has no device — plenty of competent marks
   * are interesting only in execution, and inventing a device for them
   * poisons every board that reference feeds.
   */
  device: string | null;
  /** What the form is doing semantically. Null when purely formal. */
  concept: string | null;
}

const PROMPT = `You are cataloguing a reference library of existing logos for a
brand studio. Each caption teaches a generator how a mark WORKS, so the same
thinking can be applied to a completely unrelated brand.

You are not describing a picture. You are naming design thinking.

THE ALTITUDE RULE — everything depends on this.
Write the principle, never the recipe. After each field ask yourself: "could a
designer redraw this exact mark from what I just wrote?" If yes, you are too
low. Go up one level and name the CLASS of move rather than the instance.

  Too low:  "The crossbar of the A is removed so the letter reads as a peak."
  Right:    "Meaning is carried by an element that has been removed rather
             than added."

  Too low:  "Four white vertical bars on red, inner edges cut into chevrons."
  Right:    "A continuous figure is sliced by evenly spaced gaps, so the eye
             assembles it across the interruptions."

Never name the brand, company, designer or product. Never quote the actual text
of a wordmark. Never give an aesthetic verdict — no "beautiful", "clean",
"striking", "modern". Describe mechanism only.

Ignore any background photograph, mockup or surface the logo has been placed
on. Catalogue the mark itself.

TECHNIQUE: how the mark is constructed and drawn — geometry, stroke behaviour,
weight, contrast, spatial system. One or two sentences.

DEVICE: the single ownable move that makes this mark itself, stated as a class
of move a designer could apply to an unrelated brand. One sentence.

It must be about the mark's DOMINANT element — the thing you would name first
if describing the logo to someone over the phone. A real but incidental detail
is not the device: if the mark is carried by a character and you write about
the spacing of a dot in the wordmark beside it, the caption is wrong even
though the observation is true.

Write NONE if the mark has no device — if its interest lies entirely in
execution rather than in an idea. Many perfectly good marks have no device, and
a competent mark honestly labelled NONE is far more useful to us than an
invented one. Reaching for a minor detail in order to have something to say is
the specific failure NONE exists to prevent.

CONCEPT: what the form is doing semantically — how the shape carries meaning.
One sentence. Write NONE if the mark is purely formal.

Reply with ONLY a JSON object, no prose and no code fence. Use null, not the
string "NONE", for an absent device or concept:
{"technique":"...","device":null,"concept":null}`;

// Both a literal "NONE" and a JSON null mean absent — models reach for the
// word the prompt used even when told to emit null.
function optional(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  const text = String(raw).trim();
  if (!text) return null;
  if (/^none$/i.test(text)) return null;
  return text.slice(0, 400);
}

export function parseCaptionResponse(raw: string): ReferenceCaption | null {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(match[0]) as Record<string, unknown>;
  } catch {
    return null;
  }

  // Technique is the one required field: a caption with no construction
  // reading is not a caption. Device and concept are legitimately absent.
  const technique = optional(parsed.technique);
  if (!technique) return null;

  return {
    technique,
    device: optional(parsed.device),
    concept: optional(parsed.concept),
  };
}

export async function captionReferenceImage(
  imageUrl: string,
): Promise<ReferenceCaption | null> {
  const text = await generateOpenAIText({
    instructions: "Analyze the supplied reference image according to the user's instructions.",
    input: [{
      role: "user",
      content: [
        { type: "input_image", image_url: imageUrl, detail: "high" },
        { type: "input_text", text: PROMPT },
      ],
    }],
    maxOutputTokens: 700,
    reasoningEffort: "low",
    timeoutMs: CALL_TIMEOUT_MS,
    json: true,
  });
  return parseCaptionResponse(text);
}

// Render a caption as the brief handed to the sketch generator.
//
// Technique alone describes a surface; the device is the transferable part and
// leads. A caption with no device still says something worth saying about
// construction, so it is passed rather than dropped.
export function captionBrief(caption: ReferenceCaption): string {
  const parts: string[] = [];
  if (caption.device) parts.push(`Device — ${caption.device}`);
  if (caption.concept) parts.push(`Concept — ${caption.concept}`);
  parts.push(`Technique — ${caption.technique}`);
  return parts.join(" ");
}

// Read a caption back off a jsonb column. Rows predating the caption pass, and
// rows whose captioning failed, both read as null.
export function readCaption(raw: unknown): ReferenceCaption | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const technique = optional(obj.technique);
  if (!technique) return null;
  return {
    technique,
    device: optional(obj.device),
    concept: optional(obj.concept),
  };
}
