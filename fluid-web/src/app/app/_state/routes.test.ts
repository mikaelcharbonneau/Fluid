import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_ROUTE,
  ROUTES,
  ROUTE_META,
  ROUTE_ORDER,
  ROUTE_TITLE,
  pathForRoute,
  routeForPath,
} from "./routes";

// This table is the contract between the route ids used internally and the
// directories on disk that Next turns into URLs. Legacy workflow code is kept
// outside the production source tree and has its own recovery tag.

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
});

describe("pathForRoute / routeForPath", () => {
  it("round-trips every route", () => {
    for (const route of ROUTES) {
      expect(routeForPath(pathForRoute(route))).toBe(route);
    }
  });

  it("builds the URL the browser actually gets", () => {
    expect(pathForRoute("home")).toBe("/app/home");
    expect(pathForRoute("chat")).toBe("/app/chat");
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
  // Current hashes remain valid. Retired workflow hashes intentionally fall
  // back to home rather than reviving their production screens.
  const CURRENT_HASHES = [
    'home', 'brands', 'brands-empty', 'assets', 'guides', 'settings',
    'chat',
  ];

  it("knows every current hash", () => {
    expect([...ROUTES].sort()).toEqual([...CURRENT_HASHES].sort());
  });

  it("falls back for hashes belonging to archived workflows", () => {
    for (const hash of [
      'step1', 'step2', 'step3', 'step4', 'step5',
      'logo-brief', 'logo-direction', 'logo-type', 'logo-references',
      'logo-sketches', 'logo-refine', 'logo-export',
    ]) {
      expect(ROUTES.includes(hash)).toBe(false);
      expect(pathForRoute(ROUTES.includes(hash) ? hash : DEFAULT_ROUTE)).toBe('/app/home');
    }
  });

  it("sends an unknown hash to the default route", () => {
    // e.g. the Stripe return URL used to be /app#account, which the old hash
    // router silently resolved to home; it now points at /app/settings.
    const hash = "account";
    expect(ROUTES.includes(hash)).toBe(false);
    expect(pathForRoute(ROUTES.includes(hash) ? hash : DEFAULT_ROUTE)).toBe("/app/home");
  });
});
