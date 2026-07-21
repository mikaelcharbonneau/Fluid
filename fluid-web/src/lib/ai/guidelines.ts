// Phase 3 · Brand guidelines generation.
// The capstone call: synthesize everything the brand now has — brief, audience,
// name, palette, type, logo — into a concise written brand guide (positioning,
// voice, messaging, dos & don'ts, usage notes), returned as structured data.

import Anthropic from "@anthropic-ai/sdk";

export interface MessagingPillar {
  title: string;
  body: string;
}

export interface GuidelinesResult {
  positioning: string; // one short paragraph
  voice: { traits: string[]; description: string };
  messaging: { tagline: string; pillars: MessagingPillar[] };
  dos: string[];
  donts: string[];
  usage: { logo: string; color: string; type: string };
}

export interface GuidelinesBrief {
  brief: string;
  audience?: string | null;
  name?: string | null;
  style?: string | null;
  paletteSummary?: string | null;
  typeSummary?: string | null;
  logoChoice?: string | null;
  styleContext?: string | null; // resolved Step 2 choices
}

const MODEL = "claude-opus-4-8";

const SYSTEM = `You are Fluid, an expert brand strategist writing a brand's core
guidelines. You are given everything already decided about the brand. Write a
concise, usable guide — specific to THIS brand, never generic boilerplate.

Produce a JSON object with exactly these keys:
- "positioning": one short paragraph (2-3 sentences) capturing what the brand is,
  who it's for, and why it matters.
- "voice": an object with "traits" (an array of 3-4 one-or-two-word voice
  attributes, e.g. "Warm", "Direct") and "description" (2-3 sentences on how the
  brand sounds).
- "messaging": an object with "tagline" (one short, sharp tagline) and "pillars"
  (an array of 3 objects, each {"title", "body"} — a key message theme and a
  one-sentence explanation).
- "dos": an array of 4-5 short, concrete do's.
- "donts": an array of 4-5 short, concrete don'ts.
- "usage": an object with "logo", "color", and "type" — each a one-or-two
  sentence note on how to use that asset, referencing the specifics provided.

Respond with ONLY the JSON object. No prose before or after, no markdown fences.`;

function buildUserPrompt(input: GuidelinesBrief): string {
  const lines = [`Brand brief: ${input.brief.trim()}`];
  const add = (label: string, v?: string | null) => {
    const t = (v ?? "").trim();
    if (t) lines.push(`${label}: ${t}`);
  };
  add("Brand name", input.name);
  add("Target audience", input.audience);
  add("Visual direction", input.style);
  add("Color palette", input.paletteSummary);
  add("Typography", input.typeSummary);
  add("Chosen logo", input.logoChoice);
  const ctx = (input.styleContext ?? "").trim();
  if (ctx) lines.push(`\nThe user's design choices:\n${ctx}`);
  lines.push(`\nWrite the brand guidelines as a JSON object.`);
  return lines.join("\n");
}

function strArray(v: unknown, max: number): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x ?? "").trim()).filter(Boolean).slice(0, max);
}

function extractGuidelines(text: string): GuidelinesResult {
  let raw = text.trim();
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) raw = fence[1].trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found in model response.");
  }
  const o = JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;

  const voice = (o.voice ?? {}) as Record<string, unknown>;
  const messaging = (o.messaging ?? {}) as Record<string, unknown>;
  const usage = (o.usage ?? {}) as Record<string, unknown>;

  const pillarsRaw = Array.isArray(messaging.pillars) ? messaging.pillars : [];
  const pillars: MessagingPillar[] = pillarsRaw
    .map((p) => {
      const po = (p ?? {}) as Record<string, unknown>;
      return {
        title: String(po.title ?? "").trim(),
        body: String(po.body ?? "").trim(),
      };
    })
    .filter((p) => p.title || p.body)
    .slice(0, 3);

  const result: GuidelinesResult = {
    positioning: String(o.positioning ?? "").trim(),
    voice: {
      traits: strArray(voice.traits, 4),
      description: String(voice.description ?? "").trim(),
    },
    messaging: {
      tagline: String(messaging.tagline ?? "").trim(),
      pillars,
    },
    dos: strArray(o.dos, 5),
    donts: strArray(o.donts, 5),
    usage: {
      logo: String(usage.logo ?? "").trim(),
      color: String(usage.color ?? "").trim(),
      type: String(usage.type ?? "").trim(),
    },
  };

  if (!result.positioning && result.dos.length === 0 && !result.messaging.tagline) {
    throw new Error("Model returned no usable guidelines.");
  }
  return result;
}

export async function generateBrandGuidelines(
  input: GuidelinesBrief,
): Promise<GuidelinesResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured.");
  }

  const client = new Anthropic();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 6000,
    thinking: { type: "adaptive" },
    system: SYSTEM,
    messages: [{ role: "user", content: buildUserPrompt(input) }],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  return extractGuidelines(text);
}
