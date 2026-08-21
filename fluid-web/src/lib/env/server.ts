import "server-only";
import { parseEnv } from "./parse";
import { ServerEnvSchema } from "./schema";

const raw = {
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_TEXT_MODEL: process.env.OPENAI_TEXT_MODEL,
  OPENAI_IMAGE_MODEL: process.env.OPENAI_IMAGE_MODEL,
  OPENAI_TRANSPARENT_IMAGE_MODEL: process.env.OPENAI_TRANSPARENT_IMAGE_MODEL,
  OPENAI_LETTERMARK_ANALYSIS_PROMPT_ID: process.env.OPENAI_LETTERMARK_ANALYSIS_PROMPT_ID,
  OPENAI_LETTERMARK_ANALYSIS_PROMPT_VERSION: process.env.OPENAI_LETTERMARK_ANALYSIS_PROMPT_VERSION,
  RECRAFT_API_KEY: process.env.RECRAFT_API_KEY,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  STRIPE_PRICE_STARTER: process.env.STRIPE_PRICE_STARTER,
  STRIPE_PRICE_PRO: process.env.STRIPE_PRICE_PRO,
  VERCEL_ACCESS_TOKEN: process.env.VERCEL_ACCESS_TOKEN,
  VERCEL_TEAM_ID: process.env.VERCEL_TEAM_ID,
  TEST_ERROR_SECRET: process.env.TEST_ERROR_SECRET,
  SENTRY_DSN: process.env.SENTRY_DSN,
  SENTRY_ENVIRONMENT: process.env.SENTRY_ENVIRONMENT,
  SENTRY_ORG: process.env.SENTRY_ORG,
  SENTRY_PROJECT: process.env.SENTRY_PROJECT,
  SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,
  VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA,
};

const parsed = parseEnv("server", ServerEnvSchema, raw);

export const serverEnv = parsed;

// Whether each optional integration is configured. Callers check these
// instead of letting a missing key surface as a generic thrown error deep in
// a fetch call — see e.g. RECRAFT_API_KEY in vectorize.ts.
export const capabilities = {
  recraftVectorize: Boolean(parsed.RECRAFT_API_KEY),
  domainAvailability: Boolean(parsed.VERCEL_ACCESS_TOKEN),
  billing: Boolean(
    parsed.STRIPE_SECRET_KEY && parsed.STRIPE_WEBHOOK_SECRET && parsed.STRIPE_PRICE_STARTER && parsed.STRIPE_PRICE_PRO,
  ),
  errorMonitoring: Boolean(parsed.SENTRY_DSN),
} as const;

function required(name: keyof typeof parsed): string {
  const value = parsed[name];
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

// Throwing accessors for secrets a caller needs unconditionally (the
// operation simply cannot proceed without them) — centralizes the
// "not configured" error message instead of repeating it at every call site.
export const requireSupabaseServiceRoleKey = () => required("SUPABASE_SERVICE_ROLE_KEY");
export const requireOpenAIApiKey = () => required("OPENAI_API_KEY");
export const requireRecraftApiKey = () => required("RECRAFT_API_KEY");
export const requireStripeSecretKey = () => required("STRIPE_SECRET_KEY");
export const requireVercelAccessToken = () => required("VERCEL_ACCESS_TOKEN");
