import { expect, test } from "@playwright/test";

test("landing page renders core CTAs", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /sell smarter with structured agent tenders/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /join as homeowner/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /join as agent/i })).toBeVisible();
});
