// Brand-name suggestions: 10 AI-proposed candidates the user picks from or
// overrides with their own, drafted right after the user's name preferences
// (style, composition, blacklist, must-include — see steps.ts's
// `namePreferences` step) so this call always has them in context.
//
// Uses the dedicated "brand-naming" skill rather than "brandkit" — naming
// has its own tests and anti-patterns (see skills/brand-naming/SKILL.md's
// "The 7 Tests" and "What to Avoid") that don't belong duplicated into the
// image-generation skill.

import { runBrandKitSkill } from "./run";
import { renderDraft, type BrandKitDraft } from "./context";
import type { Activity } from "@/lib/ai/activity";
import type { NameCandidate } from "./types";

const COUNT = 10;

const NAME_CONTRACT = `Propose ${COUNT} genuinely distinct name candidates for this brand, strongest
first. Apply the skill's 7 tests and its "What to Avoid" list (overused
suffixes, random AI-sounding names, names too close to competitors).

If the context below states a name style preference, every candidate must
match one of the requested styles. If it states composition limits (max
syllables, characters, or words), every candidate must fit within them. If
it lists words to avoid, none of those words (or close variants) may appear
anywhere in a candidate. If it lists words to use, every candidate must
incorporate at least one of them. Treat all of these as hard constraints,
not suggestions — a candidate that violates one is not a valid candidate.

Return JSON:
{ "names": [
    { "name": string, // the name itself, nothing else
      "why": string,  // one sentence of strategic reasoning — what it means or references, and why it fits. Be honest: if a name has a real weakness, say so here.
      "domain": string } // one domain worth checking, e.g. "cadence.so" — never claim it's available, you cannot check a registry
  ] } — exactly ${COUNT} entries.`;

function parseNames(json: unknown): NameCandidate[] {
  const v = (json ?? {}) as Record<string, unknown>;
  const raw = v.names;
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error("The studio did not propose any names.");
  }
  const names = raw
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const e = entry as Record<string, unknown>;
      const name = typeof e.name === "string" ? e.name.trim() : "";
      const why = typeof e.why === "string" ? e.why.trim() : "";
      const domain =
        typeof e.domain === "string" ? e.domain.trim().toLowerCase().replace(/^https?:\/\//, "") : "";
      if (!name || !why) return null;
      return { name, why, domain };
    })
    .filter((n): n is NameCandidate => n !== null);
  if (names.length === 0) throw new Error("The studio's name candidates were malformed.");
  return names;
}

export async function generateNameCandidates(draft: BrandKitDraft, activity: Activity): Promise<NameCandidate[]> {
  activity.emit("note", "Drafting name candidates");
  return runBrandKitSkill({
    skill: "brand-naming",
    contextText: renderDraft(draft),
    contract: NAME_CONTRACT,
    parse: parseNames,
    activity,
    // Ten names that must read as genuinely different directions, not near-
    // duplicates, is exactly the shape of task reasoning earns its cost on
    // (same reasoning as logo-concepts.ts's planning call).
    effort: "low",
    maxTokens: 3_000,
    timeoutMs: 60_000,
  });
}
