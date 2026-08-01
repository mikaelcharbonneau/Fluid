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

// The divergence phase asks for the opposite of the above: a graphite croquis
// on paper, not a finished flat mark. The client is choosing a DIRECTION, and a
// polished render invites them to judge the execution — which does not exist
// yet — instead of the idea.
//
// The tension to hold is "loose in the line, precise in the form". A sketch
// that is genuinely rough is not a sketch, it is a broken mark: letterforms
// still have to be spelled correctly and proportions still have to be
// deliberate. Only the rendering is quick.
export function pencilSketchPrompt(direction: string): string {
  return [
    `A designer's quick concept sketch of a logo, drawn by hand in a sketchbook.`,
    `${direction.trim()}`,
    ``,
    `Rendering requirements — these are absolute:`,
    `- GRAPHITE PENCIL on off-white paper. Visible pencil texture and paper`,
    `  grain, slightly uneven line weight, the odd doubled or overshot stroke.`,
    `- Monochrome graphite only — soft greys through to near-black. NO colour,`,
    `  NO ink, NO marker, NO digital vector look, NO flat solid fills.`,
    `- Drawn quickly and confidently, the way a designer thumbnails an idea.`,
    `  Faint construction lines may stay visible. Solid areas are filled with`,
    `  pencil shading or hatching, never a perfectly even tone.`,
    `- The IDEA must still read unmistakably. Letterforms spelled correctly and`,
    `  legible, proportions deliberate, shapes closed where they should close.`,
    `  Loose in the line, precise in the form.`,
    `- Plain off-white paper filling the frame. Nothing else.`,
    `- The mark centered, occupying roughly 70% of the frame.`,
    `- Viewed flat on. No desk, no hand, no pencil in shot, no cast shadow, no`,
    `  torn or curled edges, no page border, no mockup, no scene.`,
    `- No annotations, dimension lines, labels, captions, or signature.`,
  ].join("\n");
}

// A render that hangs would otherwise stall until the whole function is killed
// at maxDuration — taking the eight healthy concepts down with it. Capping each
// request means a stuck one is dropped and the board still ships.
const RENDER_TIMEOUT_MS = 120_000;

// A nine-up board fires nine renders at once, which is exactly the shape that
// trips a per-minute image quota — and a 429 on three of nine would otherwise
// hand the client a board with holes in it for no reason but timing. One
// retry, backed off with jitter so the retries don't re-collide.
//
// Deliberately bounded at one: beyond that the caller is better served by a
// short board now than a long wait for a full one, and the route has a
// deadline of its own to respect.
const RETRY_STATUSES = new Set([408, 409, 429, 500, 502, 503, 504]);
const RETRY_DELAY_MS = 4_000;

function retryDelay(): number {
  return RETRY_DELAY_MS + Math.floor(Math.random() * RETRY_DELAY_MS);
}

async function requestPng(
  prompt: string,
  quality: "low" | "medium" | "high",
): Promise<Response> {
  return fetch(OPENAI_URL, {
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
}

// Generate one image. Returns raw PNG bytes.
async function generatePng(prompt: string, quality: "low" | "medium" | "high"): Promise<Buffer> {
  let res = await requestPng(prompt, quality);
  if (!res.ok && RETRY_STATUSES.has(res.status)) {
    await new Promise((resolve) => setTimeout(resolve, retryDelay()));
    res = await requestPng(prompt, quality);
  }

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
//
// `render` chooses the treatment: "vector" for a finished flat mark, "pencil"
// for a divergence-phase croquis.
export async function renderLogoImage(opts: {
  brandId: string;
  phase: string;
  slot: string;
  direction: string;
  quality?: "low" | "medium" | "high";
  render?: "vector" | "pencil";
}): Promise<RenderedImage> {
  const prompt =
    opts.render === "pencil"
      ? pencilSketchPrompt(opts.direction)
      : logoImagePrompt(opts.direction);
  const bytes = await generatePng(prompt, opts.quality ?? "medium");
  return storeImage(bytes, `${opts.brandId}/${opts.phase}/${opts.slot}.png`);
}

// Fetch a stored image back as bytes — needed to hand a concept to Recraft.
export async function fetchImageBytes(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not read image (${res.status}).`);
  return Buffer.from(await res.arrayBuffer());
}
