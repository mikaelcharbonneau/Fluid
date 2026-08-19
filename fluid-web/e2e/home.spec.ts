import { expect, test } from "@playwright/test";

test.describe("Home", () => {
  test("loads and shows the marketing headline and primary CTA path", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.ok()).toBeTruthy();
    await expect(page).toHaveTitle(/Fluid/);
    await expect(page.locator("h1").first()).toBeVisible();
  });

  test("pricing is reachable from the homepage", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#pricing")).toBeAttached();
  });

  test("links to login and signup", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('a[href="/login"]').first()).toBeAttached();
    await expect(page.locator('a[href="/signup"]').first()).toBeAttached();
  });
});
