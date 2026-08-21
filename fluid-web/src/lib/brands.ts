// Shared types + helpers for the brands feature (Phase 2b).

export type BrandStatus = "draft" | "live";

// Reconstructs the placeholder historically stored in `name` from the opening
// words of a brief. This is kept here so old records can be distinguished from
// a real chosen name while they are resumed by the conversational flow.
function briefPlaceholderName(brief: string): string {
  const words = brief.trim().split(/\s+/).filter(Boolean).slice(0, 4);
  if (words.length === 0) return "Untitled brand";
  const s = words.join(" ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// The brand's real, chosen name — or null if the user hasn't picked one yet.
//
// `brand.name` is NOT always a name field in the usual sense: older clients
// derived it from the first few words of the brief as a placeholder so the
// brands list did not read "Untitled brand" everywhere. Callers should use
// this helper instead of `brand.name_choice || brand.name` — that fallback can
// hand the model a brief fragment as if it were the brand name.
//
// `name_choice` is the field of record, but choosing a name writes it to both
// fields, so `name` is a valid second source whenever it differs from the
// brief placeholder. That distinction is what recovers brands saved while a
// debounce race was dropping name_choice — for those, `name` holds the only
// surviving copy — without ever resurrecting the brief-fragment bug.
export function chosenBrandName(brand: {
  name?: string | null;
  name_choice?: string | null;
  brief?: string | null;
}): string | null {
  const chosen = (brand.name_choice ?? "").trim();
  if (chosen) return chosen;

  const name = (brand.name ?? "").trim();
  if (!name || name.toLowerCase() === "untitled brand") return null;
  return name === briefPlaceholderName(String(brand.brief ?? "")) ? null : name;
}

export interface Brand {
  id: string;
  name: string;
  brief: string;
  audience: string;
  competitors: string;
  style_id: string | null;
  name_choice: string | null;
  logo_choice: string | null;
  data: Record<string, unknown>;
  status: BrandStatus;
  step: number;
  created_at: string;
  updated_at: string;
}

// Fields a client is allowed to write. user_id/timestamps are server-owned.
const WRITABLE = [
  "name",
  "brief",
  "audience",
  "competitors",
  "style_id",
  "name_choice",
  "logo_choice",
  "data",
  "status",
  "step",
] as const;

type Writable = (typeof WRITABLE)[number];

// Pick only known, writable keys from an arbitrary request body.
export function sanitizeBrandInput(
  body: unknown,
): Partial<Record<Writable, unknown>> {
  const out: Partial<Record<Writable, unknown>> = {};
  if (!body || typeof body !== "object") return out;
  const rec = body as Record<string, unknown>;
  for (const key of WRITABLE) {
    if (rec[key] !== undefined) out[key] = rec[key];
  }
  if (out.status !== undefined && out.status !== "draft" && out.status !== "live") {
    delete out.status;
  }
  if (out.step !== undefined) {
    const n = Number(out.step);
    if (!Number.isInteger(n) || n < 1 || n > 5) delete out.step;
    else out.step = n;
  }
  return out;
}
