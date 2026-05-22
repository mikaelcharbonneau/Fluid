import { test, expect } from "@playwright/test";

test("health endpoint is public and reports ok", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.status).toBe("ok");
});

test("sign-in page renders provider buttons", async ({ page }) => {
  await page.goto("/signin");
  await expect(page.getByRole("heading", { name: "Log in to your account" })).toBeVisible();
  await expect(page.getByRole("button", { name: /continue with google/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /continue with apple/i })).toBeVisible();
});

test("unauthenticated visit to the wizard redirects to sign-in", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/signin/);
});

test("brand-strategy endpoint rejects unauthenticated requests", async ({ request }) => {
  const response = await request.post("/api/brand-strategy", {
    data: { about: "x", audience: "y" },
    maxRedirects: 0,
  });
  expect(response.status()).toBe(401);
});
