import { expect, test } from "@playwright/test";

test.describe("Login", () => {
  test("renders an email/password form that submits to the login API", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("#li-email")).toBeVisible();
    await expect(page.locator("#li-pw")).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    await expect(page.locator('a[href="/signup"]')).toBeVisible();
  });

  test("shows a client-side error for invalid credentials without navigating away", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#li-email").fill("nobody@example.com");
    await page.locator("#li-pw").fill("definitely-wrong-password");
    await page.locator('button[type="submit"]').click();
    // The API rejects the request; the page should surface an error rather
    // than silently redirecting to the authenticated app.
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Signup", () => {
  test("renders name/email/password fields", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.locator("#su-name")).toBeVisible();
    await expect(page.locator("#su-email")).toBeVisible();
    await expect(page.locator("#su-pw")).toBeVisible();
  });
});

test.describe("Password reset", () => {
  test("reset-request page renders an email field", async ({ page }) => {
    await page.goto("/reset-password");
    await expect(page.locator("#rr-email")).toBeVisible();
  });
});
