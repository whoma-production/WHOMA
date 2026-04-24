import { expect, test } from "@playwright/test";

test("support widget manual escalation flow works for unauthenticated users", async ({
  page
}) => {
  await page.goto("/");

  const trigger = page.getByRole("button", { name: /open support chat/i });
  await expect(trigger).toBeVisible();
  await expect(trigger).toHaveClass(/fixed/);

  const primaryHeading = page
    .getByRole("heading", { name: /where home ?owners meet agents/i })
    .first();
  const headingTopBeforeOpen = await primaryHeading.evaluate((node) =>
    Math.round(node.getBoundingClientRect().top)
  );

  await trigger.click();

  const panel = page.locator("section.support-chat-panel-enter");
  await expect(panel).toBeVisible();
  await expect(panel).toHaveClass(/fixed/);
  await expect(panel.getByRole("button", { name: /talk to a person/i })).toBeVisible();

  const closeButton = page.getByRole("button", { name: /close support chat/i });
  await expect(closeButton).toBeVisible();
  await closeButton.click();
  await expect(panel).toBeHidden();

  await trigger.click();
  await expect(panel).toBeVisible();

  await panel.getByRole("button", { name: /talk to a person/i }).click();

  await expect(
    panel.getByText(
      /add your email \(optional\), then confirm and we'll send this to our support team\./i
    )
  ).toBeVisible({ timeout: 20_000 });

  const emailInput = panel.getByPlaceholder("Your email (optional)");
  await expect(emailInput).toBeVisible();
  await emailInput.fill("qa-support-widget@example.test");

  const escalationResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/chat/escalate") && response.request().method() === "POST"
  );
  await panel.getByRole("button", { name: /^confirm$/i }).click();
  const escalationResponse = await escalationResponsePromise;
  expect(escalationResponse.ok()).toBeTruthy();

  await expect(panel.getByText(/within 1 business day\./i)).toBeVisible();
  await expect(panel.getByText("qa-support-widget@example.test")).toBeVisible();
  await expect(panel.getByPlaceholder("Your email (optional)")).toHaveCount(0);

  const headingTopAfterOpen = await primaryHeading.evaluate((node) =>
    Math.round(node.getBoundingClientRect().top)
  );
  expect(Math.abs(headingTopAfterOpen - headingTopBeforeOpen)).toBeLessThanOrEqual(1);
});
