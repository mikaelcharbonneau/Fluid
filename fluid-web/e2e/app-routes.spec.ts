import { expect, test } from "@playwright/test";

// #175 split the client-only /app into 18 real routes. These tests cover the
// half of that which does not need a logged-in user: that every route is
// actually served by Next (a missing or misnamed segment directory would 404
// instead of redirecting), that the auth gate covers all of them, and that the
// pre-#175 /app#<hash> links still land somewhere sensible.
//
// NOT covered here: deep-linking to a screen, back/forward between screens,
// refresh mid-wizard and draft resume. Those need an authenticated session,
// and this repo has no seeded test user or Supabase test credentials — CI runs
// with no secrets at all. The pure routing logic underneath them (hash → path,
// path → route, wizard next/prev) is unit-tested in
// src/app/app/_state/routes.test.ts instead.

const ROUTES = [
  "home", "brands", "brands-empty", "assets", "guides", "settings",
  "step1", "step2", "step3", "step4", "step5",
  "logo-brief", "logo-direction", "logo-type", "logo-references",
  "logo-sketches", "logo-refine", "logo-export",
];

test.describe("App routes", () => {
  for (const route of ROUTES) {
    test(`/app/${route} is a real route behind the auth gate`, async ({ page }) => {
      const response = await page.goto(`/app/${route}`);
      // Served (not a 404) and gated: the proxy bounces anonymous visitors.
      expect(response?.status(), `/app/${route} should not 404`).toBeLessThan(400);
      await expect(page).toHaveURL(/\/login$/);
    });
  }

  test("/app itself is gated", async ({ page }) => {
    const response = await page.goto("/app");
    expect(response?.status()).toBeLessThan(400);
    await expect(page).toHaveURL(/\/login$/);
  });

  test("a path that is not a route still resolves rather than erroring", async ({ page }) => {
    // Anonymous users are redirected before routing gets a say, so this asserts
    // the gate, not the 404 — but it does prove an unknown /app/* path cannot
    // reach the app.
    const response = await page.goto("/app/definitely-not-a-route");
    expect(response?.status()).toBeLessThan(400);
    await expect(page).toHaveURL(/\/login$/);
  });

  test("a legacy /app#<hash> link is gated the same way", async ({ page }) => {
    // The fragment never reaches the server, so an anonymous visit to
    // /app#settings is just a visit to /app. The browser carries the fragment
    // across the redirect onto /login, where nothing reads it — same as before
    // #175, when the gate sent /app#settings to /login too.
    const response = await page.goto("/app#settings");
    expect(response?.status()).toBeLessThan(400);
    await expect(page).toHaveURL(/\/login(#.*)?$/);
  });
});
