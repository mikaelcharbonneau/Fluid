"use client";

import React from "react";
import { usePathname, useRouter as useNextRouter } from "next/navigation";
import { resolveClick } from "./resolve-click";
import { RouterCtx } from "./router-context";
import { ROUTE_ORDER, isAppRoute, pathForRoute, routeForPath, type AppRoute } from "./routes";
import { makeToast } from "./toast";

// The App Router owns real `/app/*` routes, so deep links, refresh, and
// back/forward are the browser's job. This provider supplies the shared
// `{ route, navigate, direction }` context used by dashboard surfaces.
//
// `direction` still drives the per-screen entrance animation, and is derived
// the same way as before: forward when the destination sits later in
// ROUTE_ORDER than where we came from.
export function RouterProvider({ children }: { children: React.ReactNode }) {
  const nextRouter = useNextRouter();
  const pathname = usePathname();
  const route = routeForPath(pathname);

  const prevRoute = React.useRef(route);
  const [direction, setDirection] = React.useState<"fwd" | "back">("fwd");

  React.useEffect(() => {
    const from = prevRoute.current;
    if (from !== route) {
      setDirection(ROUTE_ORDER.indexOf(route) >= ROUTE_ORDER.indexOf(from) ? "fwd" : "back");
      prevRoute.current = route;
    }
  }, [route]);

  // `query` exists so a caller can deep-link into a screen's own sub-state —
  // navigate("settings", { tab: "billing" }) — which before #175 had to be
  // smuggled across screens through a `window.__fluidSettingsTab` global,
  // because a single /app#settings URL had nowhere to put it.
  const navigate = React.useCallback(
    (next: AppRoute, query?: Record<string, string>) => {
      if (!isAppRoute(next)) return;
      const search = query ? `?${new URLSearchParams(query)}` : "";
      nextRouter.push(pathForRoute(next) + search);
    },
    [nextRouter],
  );

  // Global click delegate. Dashboard CTAs, the left rail, and breadcrumbs can
  // navigate by matching button text (see resolve-click.tsx); the chat route
  // opts out for controls that own their own action.
  React.useEffect(() => {
    function handler(e: MouseEvent) {
      const out: { toast?: string } = {};
      const dest = resolveClick(e.target, route, out);
      if (dest) {
        e.preventDefault();
        e.stopPropagation();
        // A destination starting with "/" is already a real path (e.g. the
        // brand-creation chat at /app/chat); push it directly.
        if (dest.charAt(0) === "/") nextRouter.push(dest);
        else if (isAppRoute(dest)) navigate(dest);
      } else if (out.toast) {
        e.preventDefault();
        e.stopPropagation();
        makeToast(out.toast);
      }
    }
    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, [navigate, nextRouter, route]);

  const value = React.useMemo(() => ({ route, navigate, direction }), [route, navigate, direction]);
  return <RouterCtx.Provider value={value}>{children}</RouterCtx.Provider>;
}
