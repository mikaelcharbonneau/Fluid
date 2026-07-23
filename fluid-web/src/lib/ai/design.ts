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
export const DESIGN_PRINCIPLES = `Identity design principles (non-negotiable):
- One idea per mark. A strong logo expresses a single thought clearly; two ideas
  in one mark means neither reads. State the idea before drawing it.
- Construction: build on simple geometric relationships (halves, thirds,
  consistent radii, a consistent stroke weight). Curves meet lines tangentially.
  Nothing placed "about there" — everything placed on purpose.
- Optical correction: mathematically equal is not optically equal. Circles and
  points overshoot the baseline slightly; horizontal strokes are slightly
  thinner than vertical; optical centering beats geometric centering.
- Negative space is a material. The best marks make the space between shapes do
  work (FedEx arrow). Prefer removing a shape over adding one.
- The reduction test: the mark must survive at 16px, in a single flat color, and
  reversed out of a dark background. Fine detail, thin hairlines, and gradients
  fail this test. If it dies small, it's not a logo.
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
- Ink-on-paper only: strokes in #1C1C1E, fill="none" (tiny solid dots allowed).
  NO color, NO gradients, no defs.
- stroke-width between 2 and 3.5, stroke-linecap="round", stroke-linejoin="round".
- Hand-drawn quality: prefer <path> with slightly irregular, confident lines over
  perfect primitives; small gaps where strokes meet are good; a light
  construction tick or guide line here and there is welcome.
- Keep it a THUMBNAIL of an idea: 3–8 strokes of real content. If the concept is
  a wordmark, sketch 2–4 loose letterforms suggesting the type's character —
  do not attempt finished lettering.`;

// Rendering rules for Phase 2 finished marks.
export const HIFI_STYLE = `Finished-mark rendering rules (Phase 2):
- Self-contained SVG, viewBox="0 0 120 120", width="120", height="120",
  xmlns="http://www.w3.org/2000/svg".
- Self-contained only: no <script>, <foreignObject>, <image>, external hrefs, or
  CSS @import. Inline shapes, paths, and (sparingly) gradients only.
- Clean vector craft: deliberate geometry, consistent stroke weights, optical
  corrections applied. Use the brand's colors purposefully — most strong marks
  use one or two colors, not five.
- Assume a light background; the mark must also read as a silhouette.`;
