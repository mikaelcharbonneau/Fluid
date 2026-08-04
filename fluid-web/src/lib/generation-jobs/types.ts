export const GENERATION_ACTIONS = [
  "logo_research",
  "logo_sketches",
  "logo_refine",
] as const;

export type GenerationAction = (typeof GENERATION_ACTIONS)[number];
export type GenerationJobStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled";

export interface GenerationJob {
  id: string;
  user_id: string;
  brand_id: string;
  action: GenerationAction;
  vendor: string;
  input: Record<string, unknown>;
  status: GenerationJobStatus;
  phase: string;
  progress: number;
  attempt_count: number;
  max_attempts: number;
  provider_started_at?: string | null;
  result: Record<string, unknown> | null;
  error: { message?: string; code?: string } | null;
  cancellation_requested_at: string | null;
  created_at: string;
  updated_at: string;
}

export const JOB_CREDIT_COST: Record<GenerationAction, number> = {
  logo_research: 0,
  logo_sketches: 3,
  logo_refine: 3,
};

export function isGenerationAction(value: unknown): value is GenerationAction {
  return typeof value === "string" && GENERATION_ACTIONS.includes(value as GenerationAction);
}
