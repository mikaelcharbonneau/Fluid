// Raster rendering — OpenAI GPT-Image-2 for concept marks, stored in Supabase.
//
// PNGs are far too large for the jsonb column that holds our SVG strings, so
// every generated image is uploaded to the public `brand-assets` bucket and
// only its URL is persisted on the brand record.
//
// Note on backgrounds: gpt-image-2 does NOT support `background: "transparent"`.
// We therefore prompt for a flat white field and keep it — which is also what
// Recraft's vectorizer traces most cleanly.

import { createAdminClient } from "@/lib/supabase/admin";

const OPENAI_URL = "https://api.openai.com/v1/images/generations";
const MODEL = "gpt-image-2";
const BUCKET = "brand-assets";

export interface RenderedImage {
  url: string; // public Supabase URL
  path: string; // storage path, for later deletion
}

function apiKey(): string {
  // Trimmed: a trailing newline pasted into a dashboard silently breaks auth
  // (this exact bug already cost us a day on Stripe).
  const key = (process.env.OPENAI_API_KEY ?? "").trim();
  if (!key) throw new Error("OPENAI_API_KEY is not configured.");
  return key;
}

// Wraps an art-direction prompt with the constraints that make the output a
// LOGO rather than an illustration — and, critically, flat enough to vectorize
// without producing thousands of junk anchor points.
export function logoImagePrompt(direction: string): string {
  return [
    `A professional vector-style logo mark. ${direction.trim()}`,
    ``,
    `Rendering requirements — these are absolute:`,
    `- FLAT vector illustration style. Solid, uniform colour fills only.`,
    `- NO gradients, NO shading, NO shadows, NO glows, NO texture, NO grain,`,
    `  NO 3D, NO bevel, NO reflections, NO photographic elements.`,
    `- Hard, clean, precise edges. Crisp geometry.`,
    `- Plain flat white background. Nothing else in the frame.`,
    `- The mark centered, occupying roughly 70% of the frame, generous margin.`,
    `- No mockup, no business card, no product, no hand, no scene, no border.`,
    `- Must read clearly at small sizes; avoid fine detail and hairlines.`,
  ].join("\n");
}

// A render that hangs would otherwise stall until the whole function is killed
// at maxDuration — taking the eight healthy concepts down with it. Capping each
// request means a stuck one is dropped and the board still ships.
const RENDER_TIMEOUT_MS = 120_000;

// Generate one image. Returns raw PNG bytes.
async function generatePng(prompt: string, quality: "low" | "medium" | "high"): Promise<Buffer> {
  const res = await fetch(OPENAI_URL, {
    method: "POST",
    signal: AbortSignal.timeout(RENDER_TIMEOUT_MS),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey()}`,
    },
    body: JSON.stringify({
      model: MODEL,
      prompt,
      size: "1024x1024",
      quality,
      n: 1,
      background: "opaque", // transparent is unsupported on gpt-image-2
      output_format: "png",
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Image generation failed (${res.status}): ${detail.slice(0, 300)}`,
    );
  }

  const json = (await res.json()) as {
    data?: { b64_json?: string; url?: string }[];
  };
  const first = json.data?.[0];
  if (first?.b64_json) return Buffer.from(first.b64_json, "base64");
  // Defensive: some deployments return a URL instead of inline base64.
  if (first?.url) {
    const img = await fetch(first.url);
    if (!img.ok) throw new Error("Could not download the generated image.");
    return Buffer.from(await img.arrayBuffer());
  }
  throw new Error("Image generation returned no image data.");
}

// Upload bytes to the public bucket and return its URL.
export async function storeImage(
  bytes: Buffer,
  path: string,
  contentType = "image/png",
): Promise<RenderedImage> {
  const admin = createAdminClient();
  const { error } = await admin.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType, upsert: true });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  const { data } = admin.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path };
}

// Render one logo concept and persist it. `slot` keeps paths unique and
// human-readable: <brandId>/<phase>/<slot>.png
export async function renderLogoImage(opts: {
  brandId: string;
  phase: string;
  slot: string;
  direction: string;
  quality?: "low" | "medium" | "high";
}): Promise<RenderedImage> {
  const bytes = await generatePng(
    logoImagePrompt(opts.direction),
    opts.quality ?? "medium",
  );
  return storeImage(bytes, `${opts.brandId}/${opts.phase}/${opts.slot}.png`);
}

// Fetch a stored image back as bytes — needed to hand a concept to Recraft.
export async function fetchImageBytes(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not read image (${res.status}).`);
  return Buffer.from(await res.arrayBuffer());
}
