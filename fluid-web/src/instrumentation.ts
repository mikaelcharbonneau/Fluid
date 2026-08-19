import type { Instrumentation } from "next";

// Loads the Sentry SDK for whichever server runtime this instance is
// running (Node vs Edge). Both config files no-op when SENTRY_DSN isn't set,
// so this is safe with no monitoring configured at all.
export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  } else if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
    const { assertRequiredEnv } = await import("@/lib/env/startup");
    assertRequiredEnv();
  }
}

// Catches errors that escape normal request handling — the server-side
// analogue of the client's global-error boundary.
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  const { reportError } = await import("@/lib/monitoring/log");
  reportError("Unhandled server request error", error, {
    path: request.path,
    method: request.method,
    routerKind: context.routerKind,
    routePath: context.routePath,
    routeType: context.routeType,
  });
};
