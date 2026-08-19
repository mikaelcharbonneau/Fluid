"use client";

import React from "react";
import { usePathname, useRouter as useNextRouter } from "next/navigation";
import { resolveClick } from "./resolve-click";
import { RouterCtx } from "./router-context";
import { ROUTES, ROUTE_ORDER, WIZARD_PREV, pathForRoute, routeForPath } from "./routes";
import { makeToast } from "./toast";

// #175 replaced the prototype's own `#hash` router with the App Router: each
// screen is a real route under /app, so deep links, refresh and back/forward
// are the browser's job now. This provider keeps the exact context shape the
// 18 screens already consume — `{ route, navigate, direction }` — so none of
// them had to change; only what sits behind it did.
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
    (next: string, query?: Record<string, string>) => {
      if (!ROUTES.includes(next)) return;
      const search = query ? `?${new URLSearchParams(query)}` : "";
      nextRouter.push(pathForRoute(next) + search);
    },
    [nextRouter],
  );

  // Global click delegate. The product's CTAs, left rail, breadcrumbs and
  // wizard dock all navigate by matching button text (see resolve-click.tsx);
  // that stays as-is, it just pushes a real URL now instead of setting state.
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
        else navigate(dest);
      } else if (out.toast) {
        e.preventDefault();
        e.stopPropagation();
        makeToast(out.toast);
      }
    }
    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, [navigate, nextRouter, route]);

  // Keyboard: ESC steps back through the wizard.
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      const prev = (WIZARD_PREV as Record<string, string>)[route];
      if (prev) navigate(prev);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate, route]);

  const value = React.useMemo(() => ({ route, navigate, direction }), [route, navigate, direction]);
  return <RouterCtx.Provider value={value}>{children}</RouterCtx.Provider>;
}
