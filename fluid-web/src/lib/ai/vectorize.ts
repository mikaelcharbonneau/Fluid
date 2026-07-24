// Recraft Vectorize — the raster → vector handoff at the end of the studio
// process. The client picks a finished concept (a PNG); Recraft traces it into
// real SVG paths so the deliverable is an actual logo file: scalable,
// recolourable, editable in Illustrator or Figma.
//
// Trace quality depends entirely on the source being FLAT — solid fills, hard
// edges, no gradients or texture. That constraint is enforced upstream in
// logoImagePrompt(); if it slips, the SVG comes back with thousands of junk
// anchor points rather than clean geometry.

import { fetchImageBytes, storeImage } from "./images";

const RECRAFT_URL = "https://external.api.recraft.ai/v1/images/vectorize";

// Recraft's documented input limits.
const MAX_BYTES = 5 * 1024 * 1024;

function apiKey(): string {
  const key = (process.env.RECRAFT_API_KEY ?? "").trim();
  if (!key) throw new Error("RECRAFT_API_KEY is not configured.");
  return key;
}

export interface VectorResult {
  svg: string; // the SVG markup itself
  url: string; // stored copy in Supabase, for download/export
}

// Trace a stored PNG into SVG and persist the result alongside it.
export async function vectorizeImage(opts: {
  brandId: string;
  slot: string;
  imageUrl: string;
}): Promise<VectorResult> {
  const bytes = await fetchImageBytes(opts.imageUrl);
  if (bytes.byteLength > MAX_BYTES) {
    throw new Error("That image is too large to vectorize (5 MB limit).");
  }

  const form = new FormData();
  form.append(
    "file",
    new Blob([new Uint8Array(bytes)], { type: "image/png" }),
    "concept.png",
  );

  const res = await fetch(RECRAFT_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey()}` },
    body: form, // fetch sets the multipart boundary itself
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Vectorization failed (${res.status}): ${detail.slice(0, 300)}`);
  }

  // Recraft returns a URL to the generated SVG. Shape has varied across
  // versions, so accept the documented variants rather than assuming one.
  const json = (await res.json()) as {
    image?: { url?: string };
    data?: { url?: string }[];
  };
  const svgUrl = json.image?.url ?? json.data?.[0]?.url;
  if (!svgUrl) throw new Error("Vectorization returned no SVG.");

  const svgRes = await fetch(svgUrl);
  if (!svgRes.ok) throw new Error("Could not download the vectorized SVG.");
  const svg = await svgRes.text();
  if (!svg.includes("<svg")) throw new Error("Vectorization returned invalid SVG.");

  // Keep a copy in our own storage: Recraft's URLs are temporary.
  const stored = await storeImage(
    Buffer.from(svg, "utf8"),
    `${opts.brandId}/vector/${opts.slot}.svg`,
    "image/svg+xml",
  );

  return { svg, url: stored.url };
}
