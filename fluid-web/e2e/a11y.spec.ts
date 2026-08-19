import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// #171: automated accessibility scans. Fails the build on any serious or
// critical violation, which is the bar the issue sets.
//
// These are the pages reachable without a session. The 18 screens behind
// /app are covered by component-level axe runs in
// src/app/app/_kit/a11y.test.tsx instead, which render them in jsdom — this
// repo has no seeded test user or Supabase test credential (CI runs with no
// secrets), so a browser cannot get past the auth gate to scan them here.
const PUBLIC_PAGES = ["/", "/login", "/signup", "/reset-password"];

for (const path of PUBLIC_PAGES) {
  test(`${path} has no serious or critical axe violations`, async ({ page }) => {
    await page.goto(path);

    // Scroll the page end to end and let the [data-reveal] entrance
    // animations finish before scanning. Mid-fade those elements really are
    // low-contrast, but only for the length of the transition — scanning
    // during it measures the animation, not the design.
    await page.evaluate(async () => {
      window.scrollTo(0, document.body.scrollHeight);
      await new Promise((r) => setTimeout(r, 400));
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(1600);

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const blocking = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );

    // Name the offending selectors in the failure — a bare count sends you
    // hunting through a JSON dump.
    expect(
      blocking.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`),
    ).toEqual([]);
  });
}

test("the marketing page is fully operable by keyboard", async ({ page }) => {
  await page.goto("/");

  // Tab from the top and collect what receives focus. Every nav destination
  // and the primary CTA must be reachable without a pointer.
  const reached: string[] = [];
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      return (el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 40);
    });
    if (focused) reached.push(focused);
  }

  const joined = reached.join(" | ");
  expect(joined).toContain("How it works");
  expect(joined).toContain("Pricing");
  expect(joined).toContain("Log in");
});

test("the login form can be completed and submitted by keyboard alone", async ({ page }) => {
  await page.goto("/login");

  await page.locator("#li-email").focus();
  await page.keyboard.type("keyboard@example.com");

  // Tab order out of the email field goes through the "Forgot?" link, which
  // sits in the password field's label, before reaching the password input.
  await page.keyboard.press("Tab");
  await expect(page.locator(".label-link")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.locator("#li-pw")).toBeFocused();
  await page.keyboard.type("a-password");

  // The password reveal is a real button, so Tab reaches it and Enter works.
  await page.keyboard.press("Tab");
  await expect(page.locator(".pw-toggle")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#li-pw")).toHaveAttribute("type", "text");

  // Submitting from the form with Enter reaches the API and surfaces the
  // rejection inline, without a pointer anywhere in the journey.
  await page.locator("#li-pw").press("Enter");
  await expect(page.locator(".auth-error")).toBeVisible();
});
