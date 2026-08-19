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
import { vendorFetch } from "./vendor-fetch";
import { requireRecraftApiKey } from "@/lib/env/server";

const RECRAFT_URL = "https://external.api.recraft.ai/v1/images/vectorize";

// Recraft's documented input limits.
const MAX_BYTES = 5 * 1024 * 1024;

// A single trace is a small, synchronous op on Recraft's side — nothing here
// should ever legitimately take anywhere near this long. This is a
// non-idempotent POST, so it gets one 60s attempt and no ambiguous retry.
// That leaves route time for the follow-up SVG download and Supabase upload.
const VECTORIZE_TIMEOUT_MS = 60_000;
// The result download is a plain static-file GET off Recraft's CDN — much
// tighter budget is reasonable, and it stays well within what's left of the
// route's deadline after the trace call above.
const DOWNLOAD_TIMEOUT_MS = 20_000;
const DOWNLOAD_TOTAL_TIMEOUT_MS = 30_000;

// Guards against buffering an absurdly large body before the real MAX_BYTES
// check ever runs. Sized generously above MAX_BYTES so it never rejects a
// legitimate response — it only exists to reject a Content-Length that is
// obviously wrong (misbehaving upstream, or a redirect to something that
// isn't the traced result at all) before spending time reading it.
const MAX_DECLARED_BYTES = MAX_BYTES * 4;

const apiKey = requireRecraftApiKey;

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

  const res = await vendorFetch(
    RECRAFT_URL,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey()}` },
      body: form, // fetch sets the multipart boundary itself
    },
    {
      timeoutMs: VECTORIZE_TIMEOUT_MS,
      totalTimeoutMs: VECTORIZE_TIMEOUT_MS,
      maxRetries: 0,
      retryable: false,
      label: "Recraft vectorize",
    },
  );

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

  const svgRes = await vendorFetch(
    svgUrl,
    {},
    {
      timeoutMs: DOWNLOAD_TIMEOUT_MS,
      totalTimeoutMs: DOWNLOAD_TOTAL_TIMEOUT_MS,
      maxRetries: 1,
      retryable: true,
      label: "Recraft SVG download",
    },
  );
  if (!svgRes.ok) throw new Error("Could not download the vectorized SVG.");

  // Cheap rejection before buffering: a wildly oversized (or missing/garbage)
  // Content-Length means either a misbehaving upstream or a redirect to
  // something that was never the traced result, and there's no reason to
  // spend the read on it before the real MAX_BYTES check ever gets a look.
  const declaredLength = Number(svgRes.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_DECLARED_BYTES) {
    throw new Error("The vectorized SVG was unexpectedly large.");
  }
  const contentType = svgRes.headers.get("content-type") ?? "";
  if (contentType && !/svg|xml|text|octet-stream/i.test(contentType)) {
    throw new Error(`Unexpected content type for the vectorized SVG: ${contentType}`);
  }

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
