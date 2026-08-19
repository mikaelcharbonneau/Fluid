"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ROUTES, DEFAULT_ROUTE, pathForRoute } from "./_state/routes";

// Before #175 every screen lived at /app#<route>. Those URLs are in people's
// history, bookmarks and anything they shared, so /app keeps answering them:
// it reads the fragment on mount and replaces the entry with the real route.
// A fragment is never sent to the server, which is why this has to happen
// client-side rather than as a redirect in next.config or middleware.
export function LegacyHashRedirect() {
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    const route = ROUTES.includes(hash) ? hash : DEFAULT_ROUTE;
    router.replace(pathForRoute(route));
  }, [router]);

  return null;
}
