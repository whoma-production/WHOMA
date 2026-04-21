import { expect, test } from "@playwright/test";

test("legacy /locations routes redirect to /requests", async ({ page }) => {
  await page.goto("/locations", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/requests$/);
  await expect(
    page.getByRole("heading", { name: /seller access opens selectively/i })
  ).toBeVisible();
  await expect(page.locator('a[href*="/agent/marketplace"]')).toHaveCount(0);

  await page.goto("/locations/SW1A", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/requests\/SW1A$/);
  await expect(
    page.getByRole("heading", { level: 1, name: /seller access in/i })
  ).toBeVisible();
  await expect(page.locator('a[href*="/agent/marketplace"]')).toHaveCount(0);
});
