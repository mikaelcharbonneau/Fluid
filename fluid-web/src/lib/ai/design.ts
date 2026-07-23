// The studio's design knowledge — the body of identity-design craft injected
// into every generation and critique step. This is the "education" layer of the
// pipeline (process → knowledge → model): one place to encode how a serious
// design studio thinks, so every prompt speaks the same language.
//
// Tune this file to tune the whole studio's taste. No code below — text only.

// Taxonomy of logo mark types. Concepts must spread across TYPES, not just
// colors/shapes — this is what makes a 9-up board feel like real exploration.
export const MARK_TYPES = `Mark types (use these exact keys in TYPE fields):
- wordmark: the full name set in distinctive custom-feeling type (Google, Braun).
- lettermark: initials or a single letter as the mark (IBM's stripes, Unilever's U).
- pictorial: a literal, recognizable object drawn distinctively (Apple, Shell).
- abstract: non-literal geometry carrying the brand idea (Chase, Pepsi).
- emblem: name locked inside a shape/badge (Levi's, NFL).
- combination: symbol + wordmark designed as one lockup (Lacoste, Burger King).
- dynamic: a system with a consistent skeleton and variable expression (MIT Media Lab).`;

// Core craft rules — what separates a designed mark from a generated shape.
//
// The numeric constraints below are the difference between "consistent stroke
// weight" (which a model cannot act on) and a value it can actually hit. They
// are calibrated for our 120×120 viewBox.
export const DESIGN_PRINCIPLES = `Identity design principles (non-negotiable):

MEASURABLE CONSTRAINTS — all coordinates in a 120×120 viewBox:
- Element count: 1–2 core elements. Not 5, not 15. A mark with many parts has
  no focal point and dies at small sizes.
- Stroke width: 3–5 units for primary elements, 2–3 for secondary. Below 2.5
  reads weak and fragile; above 6 reads clumsy.
- Dot / point radius: 3–9 units.
- Spacing: at least 10–14 units between distinct elements.
- Padding: keep all artwork at least 12–18 units from the canvas edge.
- Negative space: 40–50% of the canvas must remain empty. Empty space is a
  designed element, not leftover room.
- Structural stability: two or three thin lines floating in space read as
  fragile and unfinished. Give the mark visual mass — a solid form, a thick
  stroke, or a dense repetition of 6+ lines.
- Rounded subtraction: when cutting into a shape (counters, notches, gaps),
  round the openings. Sharp interior corners read as accidental damage.

COMPOSITION:
- One idea per mark. A strong logo expresses a single thought clearly; two ideas
  in one mark means neither reads. State the idea before drawing it.
- Single focal point: the eye must know instantly where to look. Avoid several
  elements of equal visual weight competing.
- Asymmetric tension beats dead symmetry. Perfect mirror symmetry is inert;
  deliberate imbalance creates energy. (Wordmarks and emblems may be symmetric
  where the type demands it.)
- Construction: build on simple geometric relationships (halves, thirds,
  consistent radii). Curves meet lines tangentially. Nothing placed "about
  there" — everything placed on purpose.
- Optical correction: mathematically equal is not optically equal. Circles and
  points overshoot the baseline slightly; horizontal strokes are slightly
  thinner than vertical; optical centering beats geometric centering.
- Negative space is a material. The best marks make the space between shapes do
  work (FedEx arrow). Prefer removing a shape over adding one.

STANDARDS:
- The reduction test: the mark must survive at 16px, in a single flat color, and
  reversed out of a dark background. Fine detail, thin hairlines, and low
  contrast internal shapes fail this test. If it dies small, it is not a logo.
- Restraint: every element must justify its existence. No gradient, shadow, or
  extra colour "because we can".
- Distinctiveness over decoration: a plain circle with the name in Helvetica is
  a placeholder, not an identity. Every mark needs one memorable, ownable move.
- Longevity: design for a decade, not a feed. Trend-driven moves (current
  gradient fashions, corner-radius fads) age the brand prematurely.`;

// Explicitly banned moves — the clichés that read instantly as generic AI/logo-mill
// output. Both generation and critique enforce this list.
export const ANTI_CLICHE = `Banned clichés — never produce these:
- The generic swoosh / arc "dynamism" gesture.
- Globe or abstract planet with latitude lines.
- Two or three overlapping translucent circles ("connection").
- Gradient blob / amorphous liquid shape.
- Generic hexagon, shield, or infinity symbol as the whole idea.
- Lowercase name with a colored full stop as the only idea.
- Chat bubble, light bulb, rocket, or handshake for tech/ideas/growth/trust.
- Letterform with a leaf stuck on it for anything "sustainable".
- Any mark whose idea is "modern and clean" — that is a finish, not an idea.`;

// Scoring rubric used by the creative-director critique pass, and referenced by
// generators so they know the bar they will be judged against.
export const CRITIQUE_RUBRIC = `Critique rubric — score each candidate 0–100 across:
1. Concept (35%): does the mark express the brand idea and its territory, or is
   it decoration? Could you explain the idea in one sentence to a client?
2. Distinctiveness (25%): is there one ownable, memorable move? Would it be
   confused with a thousand other logos in the category? Any banned cliché is an
   automatic score below 40.
3. Craft (20%): construction quality — geometry, stroke consistency, optical
   balance, tangent quality, composure of negative space.
4. Reduction (15%): survives 16px, one color, and reversal on dark. Penalize
   fine detail and low-contrast internal shapes.
5. Longevity (5%): will this look dated in five years?
Be harsh. A polite 75 for everything helps no one; use the full range.`;

// Rendering rules for Phase 1 concept sketches — a designer's marker croquis,
// not a finished mark. Low fidelity is the point: the user is choosing a
// DIRECTION, and rough rendering keeps the focus on the idea.
export const CROQUIS_STYLE = `Croquis rendering rules (Phase 1 sketches):
- Self-contained SVG, viewBox="0 0 120 120", width="120", height="120",
  xmlns="http://www.w3.org/2000/svg".
- Ink-on-paper only: strokes and fills in #1C1C1E. NO colour, NO gradients.
- stroke-linecap="round", stroke-linejoin="round".
- GEOMETRY MUST BE PRECISE. This is a low-fidelity sketch in PRESENTATION only
  (monochrome ink, no colour, reduced detail) — never in construction. Do NOT
  wobble lines, do NOT leave gaps where strokes should meet, do NOT add
  construction ticks or guide lines. Every path closes where it should and every
  coordinate is deliberate. A rough-looking mark here is a broken mark, not a
  sketch.
- Reduced detail is the ONLY thing lowered: state the idea with the fewest
  possible shapes, and skip refinement work (exact optical corrections, colour,
  fine internal detail) that belongs to the finished mark.
- For a wordmark, lettermark, combination, or emblem: draw the actual
  letterforms as clean geometry (paths or rects), spelled correctly. Do not
  scribble a placeholder squiggle in place of type.
- All measurable constraints above (stroke width, spacing, padding, negative
  space, element count) apply here exactly as they do to a finished mark.`;

// Rendering rules for Phase 2 finished marks.
export const HIFI_STYLE = `Finished-mark rendering rules (Phase 2):
- Self-contained SVG, viewBox="0 0 120 120", width="120", height="120",
  xmlns="http://www.w3.org/2000/svg".
- Self-contained only: no <script>, <foreignObject>, <image>, external hrefs, or
  CSS @import. Inline shapes, paths, and (sparingly) gradients only.
- Clean vector craft: deliberate geometry, consistent stroke weights, optical
  corrections applied. Every measurable constraint above is enforced here.
- Colour: one or two brand colours, used purposefully. A third is rarely
  justified. Flat fills unless the chosen visual language explicitly calls for a
  gradient.
- Group related elements with <g>; use <defs> for anything reused.
- Assume a light background; the mark must also read as a flat silhouette.`;
