// Turning a strategy read into an image prompt for GPT Image 2.
//
// The image model never sees skills/brandkit/SKILL.md — only this string.
// So unlike the strategy call (which hands the model the whole skill body),
// everything the skill demands of the final render has to be spelled out
// here, inline: panel layout, anti-generic rules, text rules, the visual
// mode's cues. Same reasoning as the old logo pipeline's ANTI_SLOP block —
// strategy alone produces generic output; the render needs concrete
// instructions, not a vibe.

import type { BrandKitBrief, BrandKitLayout, BrandKitStrategy, VisualMode } from "./types";

const PANELS: Record<BrandKitLayout, string[]> = {
  "3x3": [
    "Logo cover — large logo and wordmark, minimal title, strong negative space.",
    "Logo construction — symbol breakdown, grid, or negative-space logic showing why the mark exists.",
    "Digital application — browser chrome, app header, terminal, or dashboard fragment.",
    "Brand essence — one short tagline, large readable typography, sparse composition.",
    "Color system — swatches, gradient strips, or palette cards.",
    "Typography — large type specimen or primary/secondary type pairing.",
    "Physical application — card, folder, badge, poster, label, seal, or packaging mockup.",
    "Image direction — cinematic landscape, product crop, halftone poster, or editorial scene.",
    "System detail — UI chips, input bar, command line, icon row, or component strip.",
  ],
  "2x3": [
    "Logo / wordmark — centered or offset, extremely minimal.",
    "Browser / product surface — browser bar, app frame, prompt input, or URL field.",
    "Command / functional panel — terminal, prompt bar, input state, or dashboard fragment.",
    "Atmosphere / campaign image — halftone landscape, cinematic image, or art-directed photo.",
    "Symbol / construction / badge — logo mark in target, seal, or geometric frame.",
    "Tagline / system promise — one short line, large type, quiet background.",
  ],
  "2x2": [
    "Logo cover — large logo and wordmark, strong negative space.",
    "Color and type system — palette swatches with a primary type specimen.",
    "Digital application — browser chrome, app header, or dashboard fragment.",
    "Tagline — one short line, large readable typography, sparse composition.",
  ],
  "1x3": [
    "Logo mark, isolated, generous negative space.",
    "Color system — swatches or gradient strip.",
    "One application — digital surface or physical mockup, whichever fits the brand best.",
  ],
  "4x2": [
    "Logo cover.",
    "Logo construction / geometry.",
    "Digital application.",
    "Tagline panel.",
    "Color system.",
    "Typography specimen.",
    "Physical application.",
    "Image direction / atmosphere.",
  ],
};

const ASPECT_HINT: Record<BrandKitLayout, string> = {
  "3x3": "a 4:3 landscape presentation canvas",
  "2x3": "a 16:10 landscape presentation canvas",
  "2x2": "a square presentation canvas",
  "1x3": "a wide horizontal strip",
  "4x2": "a wide 16:10 contact-sheet canvas",
};

const VISUAL_MODE_CUES: Record<VisualMode, string> = {
  "dark-developer":
    "Near-black panels, monospace accents, command lines, terminal windows, prompt bars, subtle grid, cyan/blue/coral/lime accents. Logo logic: cursor + frame, bolt + build speed, scaffold + monogram. Mood: precise, sharp, builder-native.",
  "dark-product":
    "Black / dark red / amber, glowing UI chips, card systems, segmented flows, icon rows, minimal hero text. Logo logic: signal, gift, path, operator mark, switch, loop. Mood: fast, operational, tactical.",
  "dark-nature":
    "Deep green, lime accent, misty landscapes, soft overlays, calm page labels, dark editorial grid. Logo logic: path, leaf, moon, horizon, compass, folded mark. Mood: calm, trustworthy, focused.",
  "dark-security":
    "Black/navy, shield forms, radar lines, subtle motion traces, red/blue alert chips, controlled gradients. Logo logic: shield, raptor, eye, watch, boundary. Mood: serious, vigilant, precise.",
  "light-editorial":
    "Warm ivory, paper texture, small serif labels, seals/badges, calm stationery, deep blue/red/gold accents. Logo logic: seal, shield, document, stamp, monogram. Mood: trustworthy, refined, institutional but modern.",
  luxury:
    "Ivory/stone/espresso, serif wordmark, elegant monogram, paper grain, embossing, editorial crops, soft shadows. Logo logic: monogram, seal, petal, vessel, refined typographic mark. Mood: tasteful, adult, expensive.",
  voice:
    "Dark indigo, lilac glow, waveform, mic motif, phone crop, command input, app icon. Logo logic: wave + initial, sound orb, speech path, pulse ring. Mood: fluid, intelligent, intimate.",
  cultural:
    "Halftone, CRT texture, analog print, bold accent color, poster-style panels, unexpected image crops. Logo logic: custom wordmark, icon with attitude, print-inspired mark. Mood: memorable, creative, still controlled.",
};

const ANTI_GENERIC = `Never produce:
- Random floating icons, generic startup gradients, overdesigned logos.
- The generic swoosh / arc "dynamism" gesture, a globe with latitude lines,
  two or three overlapping translucent circles, a gradient blob, a generic
  hexagon/shield/infinity symbol as the whole idea.
- A rounded monogram letter inside a soft pill/stadium container — the
  default "app icon" every AI logo mill draws.
- Chat bubble, light bulb, rocket, or handshake as the core idea.
- Meaningless sparkles, cheap neon, messy layout collages, fake tiny UI.
- Inconsistent logo marks across panels — the same mark must repeat, exactly,
  in every panel it appears.
- More than one dominant palette, or a generic purple-blue AI-startup glow.
- Corporate PowerPoint slides or soulless SaaS dashboard mockups.
Distinctiveness is required: one memorable, ownable move must be visible in
the logo, and it must repeat consistently across every panel.`;

const TEXT_RULES = `Use very little text: the brand name, the one tagline given below, short UI
chips, 2-5 section labels. No lorem ipsum, no dense paragraphs, no tiny fake
body copy, no long menu lists. Every word that appears must be large enough
and sparse enough to render legibly — do not attempt fine print.`;

const MOCKUP_RULES = `Mockups are identity applications, not feature demos: browser chrome, a
terminal window, a command prompt, an app icon, a card, a badge, a seal, a
folder, UI chips, one clean input bar. No full fake dashboards with dense
data, no busy app screens, no glossy device overload.`;

const DETAIL_RULES = `Reward a closer look with small, precise details used sparingly: page
numbers, tiny footer labels, thin rules, alignment marks, low-opacity
texture or grain. Do not overuse them.`;

export function buildBrandKitPrompt(brief: BrandKitBrief, strategy: BrandKitStrategy): string {
  const layout = brief.layout ?? "3x3";
  const panels = PANELS[layout];
  const palette = strategy.palette.map((p) => `${p.hex} (${p.role})`).join(", ");
  const avoid = (brief.avoid ?? []).filter(Boolean);

  return [
    `Create a premium brand-kit overview image for "${brief.name}".`,
    ``,
    `This is one complete brand world in a single image — a premium`,
    `brand-guidelines board from a serious identity studio. Intentional,`,
    `minimal, coherent, strategic, visually expensive, presentation-ready.`,
    `Not a generic logo, not a random mockup collage, not a messy AI moodboard.`,
    ``,
    `BRAND STRATEGY:`,
    `- Category: ${strategy.category}`,
    `- Audience: ${strategy.audience}`,
    `- Personality: ${strategy.personality}`,
    `- Emotional promise: ${strategy.emotionalPromise}`,
    `- Cultural position: ${strategy.culturalPosition}`,
    `- Trust level: ${strategy.trustLevel}`,
    `- Logo idea: ${strategy.logoIdea}`,
    `- Tagline: "${strategy.tagline}"`,
    ``,
    `LAYOUT: a ${layout.replace("x", " × ")} grid on ${ASPECT_HINT[layout]}, clean`,
    `alignment, strong consistent gutters between panels, refined negative`,
    `space. Give the sequence rhythm — not every panel equally loud; alternate`,
    `quiet, functional, emotional, technical, and atmospheric moments.`,
    ``,
    `PANELS, in this order:`,
    ...panels.map((p, i) => `${i + 1}. ${p}`),
    ``,
    `VISUAL MODE: ${VISUAL_MODE_CUES[strategy.visualMode]}`,
    ``,
    `PALETTE: use only these colours, disciplined and repeated across every`,
    `panel — ${palette}. No random rainbow, no unrelated accent colours.`,
    ``,
    `LOGO: reproduce the exact mark shown in the attached reference image —`,
    `do not redesign it, simplify it, or change its proportions. The exact`,
    `same mark must repeat, pixel-faithful, across every panel that shows it.`,
    ``,
    TEXT_RULES,
    ``,
    MOCKUP_RULES,
    ``,
    DETAIL_RULES,
    ``,
    ANTI_GENERIC,
    avoid.length ? `\nAlso never include: ${avoid.join(", ")}.` : "",
    ``,
    `Style: premium, sparse, cinematic, intentional, polished, a brand-`,
    `guidelines deck. No clutter. No copied real-world logos or trademarks.`,
  ]
    .filter((l) => l !== "")
    .join("\n");
}
