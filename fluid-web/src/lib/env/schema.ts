import { z } from "zod";

// The single source of truth for every environment variable the app reads.
// Nothing outside src/lib/env/ should touch `process.env` directly (except
// NODE_ENV/NEXT_RUNTIME/VERCEL_ENV, which Next/Vercel set unconditionally and
// aren't "configuration" in this sense).
//
// `requirement` drives both validation (see server.ts/public.ts) and doc
// generation (see scripts/verify-env-example.mjs, which checks .env.example
// stays in sync with this file):
//   - "production"  — must be set for the app to serve production traffic;
//                      startup.ts fails fast if it's missing.
//   - "feature"      — gates one optional integration; missing it disables
//                       that capability (see server.ts's `capabilities`)
//                       instead of throwing mid-request.
//   - "optional"     — has a safe, working default; only set to override it.

export type Requirement = "production" | "feature" | "optional";

export interface EnvVarMeta {
  name: string;
  scope: "public" | "server";
  requirement: Requirement;
  description: string;
}

export const PUBLIC_ENV_VARS: EnvVarMeta[] = [
  {
    name: "NEXT_PUBLIC_SUPABASE_URL",
    scope: "public",
    requirement: "optional",
    description: "Supabase project URL. Falls back to the project's known URL if unset.",
  },
  {
    name: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    scope: "public",
    requirement: "optional",
    description: "Supabase publishable (anon) key. Falls back to a known key if unset.",
  },
  {
    name: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    scope: "public",
    requirement: "optional",
    description: "Legacy alias for NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
  },
  {
    name: "SUPABASE_ANON_KEY",
    scope: "public",
    requirement: "optional",
    description:
      "Legacy unprefixed alias for the (non-secret) publishable key — despite the name, holds the same public value, not a secret.",
  },
  {
    name: "NEXT_PUBLIC_SENTRY_DSN",
    scope: "public",
    requirement: "feature",
    description: "Enables browser error monitoring. Unset means no client-side error reporting.",
  },
  {
    name: "NEXT_PUBLIC_SENTRY_ENVIRONMENT",
    scope: "public",
    requirement: "optional",
    description: "Overrides the Sentry environment label for browser events.",
  },
  {
    name: "NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA",
    scope: "public",
    requirement: "optional",
    description: "Vercel-injected commit SHA, used as the Sentry release on the client.",
  },
];

export const SERVER_ENV_VARS: EnvVarMeta[] = [
  {
    name: "SUPABASE_SERVICE_ROLE_KEY",
    scope: "server",
    requirement: "production",
    description: "Service-role Supabase key — required for the Stripe webhook, credits, and brand-kit persistence.",
  },
  {
    name: "OPENAI_API_KEY",
    scope: "server",
    requirement: "production",
    description: "Required for the conversational brand-kit generation flow.",
  },
  {
    name: "OPENAI_TEXT_MODEL",
    scope: "server",
    requirement: "optional",
    description: 'Overrides the default text model ("gpt-5.6-luna").',
  },
  {
    name: "OPENAI_IMAGE_MODEL",
    scope: "server",
    requirement: "optional",
    description: 'Overrides the default image model ("gpt-image-2").',
  },
  {
    name: "OPENAI_TRANSPARENT_IMAGE_MODEL",
    scope: "server",
    requirement: "optional",
    description: 'Overrides the default transparent-output image model ("gpt-image-2").',
  },
  {
    name: "OPENAI_LETTERMARK_ANALYSIS_PROMPT_ID",
    scope: "server",
    requirement: "optional",
    description: "Pins the lettermark-analysis prompt to a specific OpenAI-platform prompt id.",
  },
  {
    name: "OPENAI_LETTERMARK_ANALYSIS_PROMPT_VERSION",
    scope: "server",
    requirement: "optional",
    description: "Pins the lettermark-analysis prompt to a specific version (default: latest published).",
  },
  {
    name: "RECRAFT_API_KEY",
    scope: "server",
    requirement: "feature",
    description: "Enables raster-to-vector export. Unset means vectorize returns a clear 'unavailable' error.",
  },
  {
    name: "STRIPE_SECRET_KEY",
    scope: "server",
    requirement: "production",
    description: "Required for checkout, the billing portal, and the webhook.",
  },
  {
    name: "STRIPE_WEBHOOK_SECRET",
    scope: "server",
    requirement: "production",
    description: "Required to verify Stripe webhook signatures.",
  },
  {
    name: "STRIPE_PRICE_STARTER",
    scope: "server",
    requirement: "production",
    description: "Stripe recurring price id for the Starter plan.",
  },
  {
    name: "STRIPE_PRICE_PRO",
    scope: "server",
    requirement: "production",
    description: "Stripe recurring price id for the Pro plan.",
  },
  {
    name: "VERCEL_ACCESS_TOKEN",
    scope: "server",
    requirement: "feature",
    description: "Enables live domain-availability checks. Unset means suggestions show without an availability badge.",
  },
  {
    name: "VERCEL_TEAM_ID",
    scope: "server",
    requirement: "optional",
    description: "Only needed if VERCEL_ACCESS_TOKEN is a team-scoped token.",
  },
  {
    name: "TEST_ERROR_SECRET",
    scope: "server",
    requirement: "optional",
    description: "Optional bearer secret gating GET /api/internal/test-error (always disabled in production).",
  },
  {
    name: "SENTRY_DSN",
    scope: "server",
    requirement: "feature",
    description: "Enables server + edge error monitoring.",
  },
  {
    name: "SENTRY_ENVIRONMENT",
    scope: "server",
    requirement: "optional",
    description: "Overrides the Sentry environment label for server events (default: VERCEL_ENV/NODE_ENV).",
  },
  {
    name: "SENTRY_ORG",
    scope: "server",
    requirement: "optional",
    description: "Sentry org slug, for build-time source-map upload.",
  },
  {
    name: "SENTRY_PROJECT",
    scope: "server",
    requirement: "optional",
    description: "Sentry project slug, for build-time source-map upload.",
  },
  {
    name: "SENTRY_AUTH_TOKEN",
    scope: "server",
    requirement: "optional",
    description: "Scoped Sentry token for build-time source-map upload. Unset disables the upload only.",
  },
  {
    name: "VERCEL_GIT_COMMIT_SHA",
    scope: "server",
    requirement: "optional",
    description: "Vercel-injected commit SHA, used as the Sentry release on server/edge events.",
  },
];

export const ALL_ENV_VARS: EnvVarMeta[] = [...PUBLIC_ENV_VARS, ...SERVER_ENV_VARS];

// Trims and turns "" into undefined so `.optional()` behaves the way an
// empty-but-present Vercel env var should.
const trimmedOptional = () =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), z.string().trim().optional());

const secret = (minLength = 1) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().min(minLength).optional(),
  );

export const PublicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().url().optional(),
  ),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: trimmedOptional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: trimmedOptional(),
  SUPABASE_ANON_KEY: trimmedOptional(),
  NEXT_PUBLIC_SENTRY_DSN: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().url().optional(),
  ),
  NEXT_PUBLIC_SENTRY_ENVIRONMENT: trimmedOptional(),
  NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA: trimmedOptional(),
});

export const ServerEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: secret(20),
  OPENAI_API_KEY: secret(20).refine((v) => v === undefined || v.startsWith("sk-"), {
    message: "OPENAI_API_KEY should start with 'sk-'.",
  }),
  OPENAI_TEXT_MODEL: trimmedOptional(),
  OPENAI_IMAGE_MODEL: trimmedOptional(),
  OPENAI_TRANSPARENT_IMAGE_MODEL: trimmedOptional(),
  OPENAI_LETTERMARK_ANALYSIS_PROMPT_ID: trimmedOptional(),
  OPENAI_LETTERMARK_ANALYSIS_PROMPT_VERSION: trimmedOptional(),
  RECRAFT_API_KEY: secret(10),
  STRIPE_SECRET_KEY: secret(10).refine((v) => v === undefined || v.startsWith("sk_"), {
    message: "STRIPE_SECRET_KEY should start with 'sk_'.",
  }),
  STRIPE_WEBHOOK_SECRET: secret(10).refine((v) => v === undefined || v.startsWith("whsec_"), {
    message: "STRIPE_WEBHOOK_SECRET should start with 'whsec_'.",
  }),
  STRIPE_PRICE_STARTER: secret(5).refine((v) => v === undefined || v.startsWith("price_"), {
    message: "STRIPE_PRICE_STARTER should start with 'price_'.",
  }),
  STRIPE_PRICE_PRO: secret(5).refine((v) => v === undefined || v.startsWith("price_"), {
    message: "STRIPE_PRICE_PRO should start with 'price_'.",
  }),
  VERCEL_ACCESS_TOKEN: secret(10),
  VERCEL_TEAM_ID: trimmedOptional(),
  TEST_ERROR_SECRET: secret(8),
  SENTRY_DSN: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().url().optional(),
  ),
  SENTRY_ENVIRONMENT: trimmedOptional(),
  SENTRY_ORG: trimmedOptional(),
  SENTRY_PROJECT: trimmedOptional(),
  SENTRY_AUTH_TOKEN: secret(10),
  VERCEL_GIT_COMMIT_SHA: trimmedOptional(),
});

export type PublicEnv = z.infer<typeof PublicEnvSchema>;
export type ServerEnv = z.infer<typeof ServerEnvSchema>;
