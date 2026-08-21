import "server-only";
import { serverEnv } from "./server";
import { SERVER_ENV_VARS } from "./schema";

// Fails a production server instance before it serves any traffic if a
// var marked `requirement: "production"` in schema.ts is missing, and warns
// (without throwing — these environments run without all of it on purpose)
// about a few cross-field footguns.
//
// Called from instrumentation.ts's register(), which Next runs once per
// server instance at startup — NOT during `next build`, so CI/local builds
// stay green with no secrets configured.
export function checkRequiredEnv(): { missing: string[]; warnings: string[] } {
  const missing = SERVER_ENV_VARS.filter(
    (v) => v.requirement === "production" && !serverEnv[v.name as keyof typeof serverEnv],
  ).map((v) => v.name);

  const warnings: string[] = [];
  if (serverEnv.VERCEL_TEAM_ID && !serverEnv.VERCEL_ACCESS_TOKEN) {
    warnings.push("VERCEL_TEAM_ID is set but VERCEL_ACCESS_TOKEN is not — domain availability stays disabled.");
  }
  return { missing, warnings };
}

export function assertRequiredEnv(): void {
  // Deliberately VERCEL_ENV only, not NODE_ENV: Next sets NODE_ENV=production
  // for every optimized build (`next build` + `next start`), including a
  // local production build used to run e2e tests or CI — that's not "serving
  // real production traffic" and must not fail startup just because a
  // developer's machine has no secrets configured. VERCEL_ENV is the signal
  // that's actually true only for the live production deployment.
  if (process.env.VERCEL_ENV !== "production") return;

  const { missing, warnings } = checkRequiredEnv();
  for (const warning of warnings) {
    console.warn(`[env] ${warning}`);
  }
  if (missing.length > 0) {
    throw new Error(
      `Missing required production environment configuration: ${missing.join(", ")}. ` +
        "See fluid-web/.env.example.",
    );
  }
}
