import { expect, test } from "@playwright/test";

test("landing page renders core CTAs", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: /build a verified estate agent profile people can trust/i
    })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /build your verified profile/i }).first()
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /browse verified agents/i }).first()
  ).toBeVisible();
});
