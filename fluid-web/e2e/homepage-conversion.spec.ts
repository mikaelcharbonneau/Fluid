import { expect, test } from "@playwright/test";

// #178 replaced the homepage's 1500vh scroll-jacking section with a compact
// tablist. These are the guardrails on that: that the scroll trap cannot come
// back, that the thing the page exists to get people to do is reachable
// immediately, and that none of it depends on completing an animation.

test.describe("Homepage conversion path", () => {
  test("no section drives scroll from a tall track", async ({ page }) => {
    await page.goto("/");

    // The old markup: a .transform-track with an inline height:1500vh wrapping
    // a sticky .pin.
    await expect(page.locator(".transform-track")).toHaveCount(0);

    // More generally: nothing on the page may be many screens tall purely to
    // drive an animation. 400vh is well above any legitimate section and well
    // below the 1500vh this replaced.
    const tallest = await page.evaluate(() => {
      const vh = window.innerHeight;
      let worst = 0;
      for (const el of document.querySelectorAll<HTMLElement>("body *")) {
        const h = el.getBoundingClientRect().height;
        // Only count elements that are themselves tall, not wrappers whose
        // height is the sum of ordinary content.
        if (el.children.length <= 2 && h > worst) worst = h;
      }
      return worst / vh;
    });
    expect(tallest).toBeLessThan(4);
  });

  test("the whole page is a handful of viewports, not twenty", async ({ page }) => {
    await page.goto("/");
    const viewports = await page.evaluate(
      () => document.documentElement.scrollHeight / window.innerHeight,
    );
    expect(viewports).toBeLessThan(8);
  });

  test("the conversion input is in the first viewport and works", async ({ page }) => {
    await page.goto("/");

    const input = page.locator(".idea-input--hero input");
    await expect(input).toBeVisible();

    // "Within two normal viewports" per the issue — it is actually inside the
    // first, but assert the requirement rather than today's exact layout.
    const topInViewports = await page.evaluate(() => {
      const el = document.querySelector(".idea-input--hero");
      if (!el) return Infinity;
      return (el.getBoundingClientRect().top + window.scrollY) / window.innerHeight;
    });
    expect(topInViewports).toBeLessThan(2);

    await input.fill("a coffee brand for night owls");
    await page.locator(".idea-input--hero button[type=submit]").click();
    await expect(page).toHaveURL(/\/signup\?idea=/);
  });

  test("pricing is reachable from the first viewport without scrolling through a story", async ({ page }) => {
    await page.goto("/");
    // The nav's Pricing link is on screen from the start.
    await expect(page.locator('.nav a[href="#pricing"]')).toBeVisible();
    await page.locator('.nav a[href="#pricing"]').click();
    await expect(page).toHaveURL(/#pricing$/);
    await expect(page.locator("#pricing")).toBeInViewport();
  });

  test("a skip link jumps straight to the input", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skip = page.locator(".skip-link");
    await expect(skip).toBeFocused();
    await skip.press("Enter");
    await expect(page).toHaveURL(/#start-here$/);
  });
});

test.describe("Story section", () => {
  test("every chapter is reachable without waiting for an animation", async ({ page }) => {
    await page.goto("/");
    const tabs = page.locator("[role=tab]");
    await expect(tabs).toHaveCount(6);

    for (let i = 0; i < 6; i++) {
      await tabs.nth(i).click();
      await expect(tabs.nth(i)).toHaveAttribute("aria-selected", "true");
      // The matching panel is showing, and it has real content.
      const panel = page.locator("[role=tabpanel]");
      await expect(panel).toBeVisible();
      await expect(panel.locator(".story-title")).not.toBeEmpty();
    }
  });

  test("chapters traverse with arrow keys", async ({ page }) => {
    await page.goto("/");
    const tabs = page.locator("[role=tab]");
    await tabs.first().click();
    await tabs.first().focus();

    await page.keyboard.press("ArrowRight");
    await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("End");
    await expect(tabs.nth(5)).toHaveAttribute("aria-selected", "true");
    // Wraps.
    await page.keyboard.press("ArrowRight");
    await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "true");
  });

  test("interacting stops the auto-advance for good", async ({ page }) => {
    await page.goto("/");
    const tabs = page.locator("[role=tab]");
    await tabs.nth(2).click();
    await expect(tabs.nth(2)).toHaveAttribute("aria-selected", "true");
    // Longer than the advance interval: the chapter must not move on its own
    // after someone has chosen one.
    await page.waitForTimeout(6500);
    await expect(tabs.nth(2)).toHaveAttribute("aria-selected", "true");
  });
});

test.describe("Reduced motion", () => {
  // page.emulateMedia rather than test.use({ reducedMotion }): the project in
  // playwright.config.ts spreads devices["Desktop Chrome"], which wins over a
  // describe-level test.use here, and the story then auto-advanced under a
  // test that claimed to be testing that it doesn't. Emulating on the page
  // itself is unambiguous — and it has to happen before goto, because the
  // component reads the media query once when it mounts.
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
  });

  test("the media query is actually being emulated", async ({ page }) => {
    // Guards the guard: without this, the two tests below would keep passing
    // if the emulation silently stopped applying.
    await page.goto("/");
    const reduced = await page.evaluate(
      () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
    expect(reduced).toBe(true);
  });

  test("the story does not advance on its own, and every chapter is still reachable", async ({ page }) => {
    await page.goto("/");
    const tabs = page.locator("[role=tab]");
    await expect(tabs.first()).toHaveAttribute("aria-selected", "true");

    await page.waitForTimeout(6500);
    await expect(tabs.first()).toHaveAttribute("aria-selected", "true");

    await tabs.nth(4).click();
    await expect(tabs.nth(4)).toHaveAttribute("aria-selected", "true");
  });

  test("the conversion input and pricing are both still there", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".idea-input--hero input")).toBeVisible();
    await expect(page.locator("#pricing")).toBeAttached();
  });
});

test.describe("Small and zoomed viewports", () => {
  // Approximates a phone, and a 1280px window at 200% browser zoom.
  for (const vp of [
    { width: 390, height: 844, label: "phone" },
    { width: 640, height: 400, label: "200% zoom" },
  ]) {
    test(`${vp.label}: input stays in reach and nothing overflows sideways`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/");

      const m = await page.evaluate(() => {
        const el = document.querySelector(".idea-input--hero");
        const top = el ? (el.getBoundingClientRect().top + window.scrollY) / window.innerHeight : Infinity;
        return {
          top,
          overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
          viewports: document.documentElement.scrollHeight / window.innerHeight,
        };
      });

      expect(m.top).toBeLessThan(2);
      expect(m.overflowX).toBe(false);
      expect(m.viewports).toBeLessThan(12);
    });
  }
});
