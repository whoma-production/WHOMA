import { expect, test } from "@playwright/test";

test.describe.configure({ timeout: 120_000 });

function toDateTimeLocal(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  const hours = String(value.getHours()).padStart(2, "0");
  const minutes = String(value.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

async function signInAsPreviewRole(
  page: import("@playwright/test").Page,
  role: "HOMEOWNER" | "AGENT",
  email: string,
  callbackUrl: string
): Promise<import("@playwright/test").Page> {
  const csrfResponse = await page.request.get("/api/auth/csrf");
  expect(csrfResponse.ok()).toBeTruthy();

  const csrfPayload = (await csrfResponse.json()) as { csrfToken?: string };
  expect(csrfPayload.csrfToken).toBeTruthy();

  const signInResponse = await page.request.post("/api/auth/callback/preview", {
    headers: {
      "X-Auth-Return-Redirect": "1"
    },
    form: {
      callbackUrl,
      csrfToken: csrfPayload.csrfToken ?? "",
      email,
      role
    }
  });

  expect(signInResponse.ok()).toBeTruthy();

  const authenticatedPage = await page.context().newPage();
  await authenticatedPage.goto(callbackUrl, { waitUntil: "domcontentloaded" });
  return authenticatedPage;
}

test("marketplace forms are interactive on first load after preview sign-in", async ({
  page
}) => {
  const homeownerPage = await signInAsPreviewRole(
    page,
    "HOMEOWNER",
    `marketplace-homeowner-${Date.now()}@example.test`,
    "/homeowner/instructions"
  );

  await homeownerPage.goto("/homeowner/instructions/new", {
    waitUntil: "networkidle"
  });
  await homeownerPage
    .locator('form[data-form-ready="true"]')
    .first()
    .waitFor({ timeout: 20_000 });

  const addressInput = homeownerPage.getByLabel("Property address line 1");
  await addressInput.fill("12 Example Road");
  await homeownerPage.getByRole("button", { name: "Reset form" }).click();
  await expect(addressInput).toHaveValue("");

  await addressInput.fill("12 Example Road");
  await homeownerPage.getByLabel("City").fill("London");
  await homeownerPage.getByLabel("Postcode").fill("SW1A 1AA");
  await homeownerPage.getByLabel("Bedrooms").fill("2");
  await homeownerPage
    .getByLabel("Short property summary")
    .fill(
      "Bright two bedroom flat with recent upgrades, strong natural light, and chain-free seller near transport."
    );
  await homeownerPage
    .getByLabel("Seller goals")
    .fill(
      "Need realistic pricing advice, accompanied viewings, and weekly communication through exchange and completion."
    );
  await homeownerPage
    .getByLabel("Must-haves, comma-separated")
    .fill("Accompanied viewings, weekly reporting");

  const now = new Date();
  now.setSeconds(0, 0);
  const bidWindowStartAt = new Date(now.getTime() - 60 * 60 * 1000);
  const bidWindowEndAt = new Date(bidWindowStartAt.getTime() + 24 * 60 * 60 * 1000);
  await homeownerPage.getByLabel("Bid window start").fill(toDateTimeLocal(bidWindowStartAt));
  await homeownerPage.getByLabel("Bid window end").fill(toDateTimeLocal(bidWindowEndAt));
  await homeownerPage.getByLabel("Bid window hours").fill("24");

  await homeownerPage.getByRole("button", { name: "Launch instruction" }).click();
  const instructionSuccess = homeownerPage.locator(
    "text=/Instruction\\s+\\S+\\s+was created successfully/i"
  );
  await expect(instructionSuccess.first()).toBeVisible({ timeout: 20_000 });
  const instructionSuccessText = await instructionSuccess.first().innerText();
  const instructionMatch = instructionSuccessText.match(/Instruction\s+([A-Za-z0-9_-]+)/i);
  const instructionId = instructionMatch?.[1];
  expect(instructionId).toBeTruthy();

  const agentPage = await signInAsPreviewRole(
    page,
    "AGENT",
    `marketplace-agent-${Date.now()}@example.test`,
    "/agent/onboarding"
  );

  await agentPage.goto(`/agent/marketplace/${instructionId}/proposal`, {
    waitUntil: "networkidle"
  });
  await agentPage
    .locator('form[data-form-ready="true"]')
    .first()
    .waitFor({ timeout: 20_000 });

  await agentPage.getByRole("button", { name: "Submit Proposal" }).click();
  await expect(
    agentPage.locator("text=/Proposal sent successfully/i").first()
  ).toBeVisible({ timeout: 20_000 });
});
