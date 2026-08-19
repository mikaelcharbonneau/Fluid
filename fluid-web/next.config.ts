import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
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
