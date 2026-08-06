// Visual identity brief — skill-native path.
//
// This is the same deliverable Claude produces when it runs brand-identity:
// a full markdown brief (strategy, logo direction, palette, type, imagery,
// principles, expressions). Fluid used to crush that into a tiny JSON shape
// for widgets; logos then saw almost none of the design thinking.
//
// Here the skill writes the real document. Logo generation reads it whole.

import { runSkillDocument } from "./run";
import type { BrandContext } from "./context";
import type { Activity } from "@/lib/ai/activity";
import { silentActivity } from "@/lib/ai/activity";

/** Budget shared with logo renders inside the 300s route. */
const BRIEF_TIMEOUT_MS = 140_000;
const BRIEF_MAX_TOKENS = 24_000;

/**
 * Contract that asks for the skill's real Output section — not a widget JSON.
 * Mirrors brand-identity SKILL.md § Output: Visual Identity Brief.
 */
export function visualIdentityBriefContract(opts: {
  name: string;
  markType: string;
  direction?: string;
  avoid: string[];
}): string {
  const avoid =
    opts.avoid.length > 0
      ? opts.avoid.join(", ")
      : "(none stated — still apply the skill's category cliché list)";
  const direction = (opts.direction ?? "").trim() || "not specified — choose from positioning";

  return `Produce the full Visual Identity Brief for "${opts.name}" exactly as
the skill's "Output: Visual Identity Brief" section specifies — all eight
sections, in that order, as markdown a designer could execute from:

## 01 — Identity Strategy Statement
## 02 — Logo Direction
## 03 — Color Palette
## 04 — Typography
## 05 — Imagery & Photography Style
## 06 — Iconography & Illustration
## 07 — Design Principles
## 08 — Brand Expressions

Client decisions already locked (honour them):
- Brand name: ${opts.name}
- Preferred mark structure: ${opts.markType}
- Chosen visual register / direction: ${direction}
- Must never appear: ${avoid}

Rules:
- Start with a level-1 title: "# ${opts.name} — Visual Identity Brief"
- Be specific the way the skill demands: real hex codes, real font names,
  real logo references with which quality to borrow, concrete avoid lists.
- Write for a designer who has not seen the brand yet.
- Do not produce JSON. Do not produce six alternate mark construction blurbs
  as the main deliverable — section 02 is logo *direction*, not six finished
  drawings.`;
}

/** Pull hex colours + nearby role labels from the brief for the UI strip. */
export function extractPaletteFromBrief(
  markdown: string,
): Array<{ hex: string; role: string }> {
  const out: Array<{ hex: string; role: string }> = [];
  const seen = new Set<string>();
  const re = /#([0-9A-Fa-f]{6})\b/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(markdown)) !== null && out.length < 6) {
    const hex = `#${match[1].toUpperCase()}`;
    if (seen.has(hex)) continue;
    seen.add(hex);
    const window = markdown.slice(Math.max(0, match.index - 80), match.index + 80);
    const name =
      window.match(
        /([A-Z][A-Za-z0-9 /&+-]{1,40})\s*[—–:-]\s*`?#?[0-9A-Fa-f]{0,6}/,
      )?.[1]?.trim() ||
      window.match(/\*\*([^*]{2,40})\*\*/)?.[1]?.trim() ||
      "Colour";
    out.push({ hex, role: name.slice(0, 48) });
  }
  return out;
}

/** Opening strategy paragraph for the UI summary card. */
export function extractStrategyFromBrief(markdown: string): string {
  const section = markdown.match(
    /##\s*0?1[^\n]*Identity Strategy[\s\S]*?(?=##\s*0?2|\n##\s|$)/i,
  );
  if (section) {
    const body = section[0]
      .replace(/^##[^\n]*\n+/, "")
      .replace(/\n+/g, " ")
      .trim();
    if (body.length > 40) return body.slice(0, 600);
  }
  const para = markdown
    .split(/\n\n+/)
    .map((p) => p.replace(/^#+\s.*$/gm, "").trim())
    .find((p) => p.length > 80);
  return (para ?? markdown.slice(0, 400)).replace(/\s+/g, " ").trim().slice(0, 600);
}

export async function generateVisualIdentityBrief(
  context: BrandContext,
  activity: Activity = silentActivity,
): Promise<string> {
  const name = (context.name ?? "").trim() || "Untitled";
  const markType = context.logoType ?? "wordmark";
  const avoid = context.avoid ?? [];

  activity.emit("note", "Writing the visual identity brief (brand-identity skill)");

  return runSkillDocument({
    skill: "brand-identity",
    context,
    activity,
    effort: "medium",
    maxTokens: BRIEF_MAX_TOKENS,
    timeoutMs: BRIEF_TIMEOUT_MS,
    minChars: 1_200,
    contract: visualIdentityBriefContract({
      name,
      markType,
      direction: context.direction,
      avoid,
    }),
    note: [
      `Brand name is locked: ${name}.`,
      `Mark structure preference: ${markType}.`,
      context.direction ? `Visual direction chosen: ${context.direction}.` : "",
      avoid.length ? `Client refusals: ${avoid.join(", ")}.` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  });
}
