// Shared types + helpers for the brands feature (Phase 2b).

export type BrandStatus = "draft" | "live";

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
