import { expect, test } from "@playwright/test";

test.describe("Not found", () => {
  test("shows the branded 404 for an unknown route", async ({ page }) => {
    const response = await page.goto("/this-route-does-not-exist");
    expect(response?.status()).toBe(404);
    await expect(page.getByText(/we couldn't find that page/i)).toBeVisible();
    await expect(page.locator('a[href="/"]')).toBeVisible();
  });
});

test.describe("Deliberate test error", () => {
  test("the preview test-error endpoint responds (guarded in production, live elsewhere)", async ({
    request,
  }) => {
    const res = await request.get("/api/internal/test-error", { failOnStatusCode: false });
    // Locally/preview (no VERCEL_ENV=production) it deliberately throws — the
    // framework turns that into a 500. In a real production deploy it 404s.
    expect([404, 500]).toContain(res.status());
  });
});
