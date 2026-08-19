import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_ROUTE,
  ROUTES,
  ROUTE_META,
  ROUTE_ORDER,
  ROUTE_TITLE,
  WIZARD_NEXT,
  WIZARD_PREV,
  pathForRoute,
  routeForPath,
} from "./routes";

// #175 turned the prototype's `#hash` fragments into real /app routes. This
// table is now the contract between three things that can drift apart
// independently: the route ids the screens use internally, the directories on
// disk that Next turns into URLs, and the old hash links still out in the
// world. Each of those gets a test here.

describe("route table", () => {
  it("has a route directory on disk for every route id", () => {
    const appDir = path.join(process.cwd(), "src/app/app");
    for (const route of ROUTES) {
      const page = path.join(appDir, route, "page.tsx");
      expect(fs.existsSync(page), `missing ${route}/page.tsx`).toBe(true);
    }
  });

  it("covers every route id in ROUTE_ORDER, ROUTE_META and ROUTE_TITLE", () => {
    expect([...ROUTE_ORDER].sort()).toEqual([...ROUTES].sort());
    expect(Object.keys(ROUTE_META).sort()).toEqual([...ROUTES].sort());
    expect(Object.keys(ROUTE_TITLE).sort()).toEqual([...ROUTES].sort());
  });

  it("keeps the wizard's next/prev links inside the route table", () => {
    for (const [from, to] of Object.entries(WIZARD_NEXT)) {
      expect(ROUTES).toContain(from);
      expect(ROUTES).toContain(to);
    }
    for (const [from, to] of Object.entries(WIZARD_PREV)) {
      expect(ROUTES).toContain(from);
      expect(ROUTES).toContain(to);
    }
  });

  it("makes next/prev mutual inverses across the wizard", () => {
    for (const [from, to] of Object.entries(WIZARD_PREV)) {
      expect((WIZARD_NEXT as Record<string, string>)[to]).toBe(from);
    }
  });
});

describe("pathForRoute / routeForPath", () => {
  it("round-trips every route", () => {
    for (const route of ROUTES) {
      expect(routeForPath(pathForRoute(route))).toBe(route);
    }
  });

  it("builds the URL the browser actually gets", () => {
    expect(pathForRoute("home")).toBe("/app/home");
    expect(pathForRoute("logo-brief")).toBe("/app/logo-brief");
  });

  it("ignores anything past the route segment", () => {
    expect(routeForPath("/app/settings/anything/deeper")).toBe("settings");
  });

  it("falls back to the default route for unknown or absent paths", () => {
    expect(routeForPath("/app/not-a-route")).toBe(DEFAULT_ROUTE);
    expect(routeForPath("/app")).toBe(DEFAULT_ROUTE);
    expect(routeForPath("/app/")).toBe(DEFAULT_ROUTE);
    expect(routeForPath(null)).toBe(DEFAULT_ROUTE);
  });

  it("does not mistake a route-like prefix for a route", () => {
    // `/app/settings-export` is not `/app/settings`.
    expect(routeForPath("/app/settings-export")).toBe(DEFAULT_ROUTE);
  });
});

describe("legacy /app#<hash> compatibility", () => {
  // Every hash the pre-#175 router accepted must still resolve, because those
  // URLs are in browser history, bookmarks and anything anyone shared. The
  // fragment never reaches the server, so /app resolves it client-side (see
  // legacy-hash-redirect.tsx) using exactly this mapping.
  const LEGACY_HASHES = [
    'home', 'brands', 'brands-empty', 'assets', 'guides', 'settings',
    'step1', 'step2', 'step3', 'step4', 'step5',
    'logo-brief', 'logo-direction', 'logo-type', 'logo-references',
    'logo-sketches', 'logo-refine', 'logo-export',
  ];

  it("still knows every hash the old router accepted", () => {
    expect([...ROUTES].sort()).toEqual([...LEGACY_HASHES].sort());
  });

  it("maps each old hash to a real route path", () => {
    for (const hash of LEGACY_HASHES) {
      expect(ROUTES.includes(hash) ? pathForRoute(hash) : pathForRoute(DEFAULT_ROUTE))
        .toBe(`/app/${hash}`);
    }
  });

  it("sends a hash the old router did not know to the default route", () => {
    // e.g. the Stripe return URL used to be /app#account, which the old hash
    // router silently resolved to home; it now points at /app/settings.
    const hash = "account";
    expect(ROUTES.includes(hash)).toBe(false);
    expect(pathForRoute(ROUTES.includes(hash) ? hash : DEFAULT_ROUTE)).toBe("/app/home");
  });
});
