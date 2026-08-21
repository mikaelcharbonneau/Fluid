import type { BrandStatus } from "@/lib/brands";

/** The subset of a persisted brand record used by dashboard surfaces. */
export interface DashboardBrand {
  id: string;
  name?: string | null;
  brief?: string | null;
  audience?: string | null;
  competitors?: string | null;
  style_id?: string | null;
  name_choice?: string | null;
  logo_choice?: string | null;
  data?: Record<string, unknown> | null;
  status?: BrandStatus | null;
  step?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface AppUser {
  id: string;
  email: string;
  name: string;
  initial: string;
}

export interface BillingStatus {
  tier: string;
  status: string;
  balance: number;
  monthlyTokens: number;
  current_period_end: string | null;
}

export interface BrandLogoRecord {
  name?: string | null;
  svg?: string | null;
}

export interface BrandColor {
  hex: string;
}

export interface BrandPalette {
  colors?: BrandColor[];
}

export interface BrandKitImage {
  imageUrl?: string | null;
}

export type ActivityKind = "phase" | "tool" | "prompt" | "thinking" | "note" | "warn";

export interface ActivityEvent {
  seq: number;
  at: number;
  kind: ActivityKind;
  label: string;
  detail?: string;
}

export interface ActivityStartDetail {
  kind: "start";
  name?: string;
}

export interface ActivityEventDetail {
  kind: "event";
  event: ActivityEvent;
}

export interface ActivityEndDetail {
  kind: "end";
  error?: string | null;
}

export type ActivityDetail = ActivityStartDetail | ActivityEventDetail | ActivityEndDetail;

export interface ActivityResult {
  data?: unknown;
  error?: string;
  code?: string;
}
