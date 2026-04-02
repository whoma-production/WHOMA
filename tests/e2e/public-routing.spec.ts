import { expect, test } from "@playwright/test";

test("legacy /locations routes redirect to /requests", async ({ page }) => {
  await page.goto("/locations", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/requests$/);
  await expect(
    page.getByRole("heading", { name: /find seller requests by area/i })
  ).toBeVisible();

  await page.goto("/locations/SW1A", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/requests\/SW1A$/);
  await expect(
    page.getByRole("heading", { name: /open seller requests in/i })
  ).toBeVisible();
});

