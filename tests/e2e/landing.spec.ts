import { expect, test } from "@playwright/test";

test("landing page renders core CTAs", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: /where home owners meet agents/i
    })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /create your profile/i }).first()
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /browse verified agents/i }).first()
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: /evidence is judged by behaviour, not profile copy/i
    })
  ).toBeVisible();
  await expect(
    page.getByText(/qualified density, transaction logging/i)
  ).toBeVisible();
});
