import { expect, test } from "@playwright/test";

// The reveal-on-scroll / custom-cursor animations are progressive
// enhancement, gated behind a `.js-reveal` class only an inline script adds.
// Without JavaScript, content must render at full opacity by default (see
// `[data-reveal] { opacity: 1; ... }` in marketing.css) rather than staying
// hidden waiting for a script that never runs.
//
// NOTE: the home page ("/") is excluded here. It's server-rendered behind a
// React streaming shell (`hidden id="S:..."` + a same-origin reveal
// `<script>`) that only Home hits — every other route in this file renders
// directly. That's pre-existing behavior, unrelated to hydration mismatches
// or anything touched by #173 (confirmed by reproducing it with this PR's
// root loading.tsx/error.tsx/not-found.tsx each removed in turn — still
// present) — the CSS itself already does the right thing, the framework's
// own streaming shell is what's JS-dependent here. Tracked as a follow-up;
// not this issue's fix.
test.describe("No JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("the login form is visible and usable without JS", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("#li-email")).toBeVisible();
    await expect(page.locator("#li-pw")).toBeVisible();
  });

  test("the signup form is visible and usable without JS", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.locator("#su-email")).toBeVisible();
  });
});

test.describe("Reduced motion", () => {
  test("homepage content is fully visible immediately, not mid-reveal-animation", async ({ page }) => {
    // Emulate the media query on the page because this Playwright setup does
    // not expose reducedMotion as a typed test fixture, and do it before the
    // page mounts so components read the intended preference.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    // With reduced motion, marketing.css forces opacity:1/transform:none on
    // every reveal target regardless of the .in class — nothing should be
    // sitting translated/transparent waiting on a scroll-triggered class add.
    const revealTargets = page.locator("[data-reveal]");
    const count = await revealTargets.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      await expect(revealTargets.nth(i)).toHaveCSS("opacity", "1");
    }
  });
});
