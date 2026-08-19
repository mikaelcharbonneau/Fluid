import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// Generated brand assets (logo concepts, sketches, boards) are uploaded to
// the Supabase `brand-assets` bucket and served through its **public** URL —
// see storeImage() in src/lib/ai/images.ts, which calls getPublicUrl(). So
// allowing the optimizer to fetch them exposes nothing that was not already
// public; #171 warned against loosening access to satisfy the loader, and this
// does not.
//
// Scoped as tightly as the host allows: this one project's hostname, https
// only, and only the public-object path of that one bucket. Signed or private
// object paths under /storage/v1/object/sign/ are deliberately NOT matched.
//
// Reads process.env directly rather than through src/lib/env for the same
// reason the Sentry block below does: this file is resolved by the Next CLI
// outside the app's compiled module graph.
const SUPABASE_HOST = (() => {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://jhxbylzfunojlfihlwhq.supabase.co";
  try {
    return new URL(raw).hostname;
  } catch {
    return "jhxbylzfunojlfihlwhq.supabase.co";
  }
})();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: SUPABASE_HOST,
        pathname: "/storage/v1/object/public/brand-assets/**",
      },
    ],
  },
};

// Uploads source maps to Sentry at build time so production stack traces
// resolve to real source — a no-op (besides a console note) when
// SENTRY_AUTH_TOKEN isn't set, so this is safe with monitoring unconfigured.
//
// Reads process.env directly rather than through src/lib/env: this file is
// loaded by the Next CLI itself at config-resolution time, outside the
// app's compiled module graph, so the app's env module (and its
// server-only/webpack-alias assumptions) doesn't apply here.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  widenClientFileUpload: true,
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
  telemetry: false,
});
