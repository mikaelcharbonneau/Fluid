import { expect, test } from "@playwright/test";

// React logs hydration mismatches to the browser console (dev and prod
// builds both warn — prod uses a shorter, minified message but still warns).
// Capturing every console message and asserting none of them mention
// hydration is a direct, load-bearing regression test: it fails the moment
// any of these routes starts mutating React-owned DOM before hydration
// completes again.
const HYDRATION_WARNING_PATTERN = /hydrat|did not match|server rendered (html|text)/i;

const ROUTES = ["/", "/login", "/signup", "/reset-password"];

for (const route of ROUTES) {
  test(`${route} hydrates with no React hydration warnings`, async ({ page }) => {
    const messages: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error" || msg.type() === "warning") messages.push(msg.text());
    });
    page.on("pageerror", (err) => messages.push(err.message));

    await page.goto(route);
    // Give the inline bootstrap scripts and any async page script (marketing.js,
    // login.js, ...) time to load and run — a race is exactly what this test
    // exists to catch, so don't rush past it.
    await page.waitForTimeout(1000);

    const hydrationWarnings = messages.filter((m) => HYDRATION_WARNING_PATTERN.test(m));
    expect(hydrationWarnings, `console messages on ${route}:\n${messages.join("\n")}`).toEqual([]);
  });
}
