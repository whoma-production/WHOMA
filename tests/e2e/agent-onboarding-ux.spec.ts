import { expect, test } from "@playwright/test";

import { signInAsAgent } from "./support/mock-auth";

test.describe.configure({ timeout: 120_000 });

test("agent onboarding centers upload-first profile generation and publish gating", async ({
  page
}) => {
  const runId = `${Date.now()}-${test.info().workerIndex}`;
  const email = `qa-onboarding-ux-${runId}@example.test`;

  const agentPage = await signInAsAgent(page, {
    email,
    fullName: `QA Onboarding ${runId}`
  });

  await expect(
    agentPage.getByRole("heading", { name: /let's build your whoma profile/i })
  ).toBeVisible();
  await expect(
    agentPage.getByRole("button", { name: /upload cv \/ resume/i })
  ).toBeVisible();
  await expect(agentPage.getByText("Import", { exact: true })).toBeVisible();
  await expect(
    agentPage.getByText("Draft preview", { exact: true })
  ).toBeVisible();
  await expect(
    agentPage.getByText("Confirm details", { exact: true })
  ).toBeVisible();
  await expect(
    agentPage.getByText("Quick interview", { exact: true })
  ).toBeVisible();
  await expect(
    agentPage.getByText("Profile ready", { exact: true })
  ).toBeVisible();

  await expect(
    agentPage.getByRole("heading", {
      name: /a draft that already looks ready/i
    })
  ).toBeVisible();
  await expect(
    agentPage.getByRole("heading", {
      name: /answer only what the draft still needs/i
    })
  ).toBeVisible();
  await expect(
    agentPage.getByRole("heading", { name: /email verification/i })
  ).toBeVisible();
  await expect(
    agentPage.getByText("Step 5 · Publish gate", { exact: true })
  ).toBeVisible();
  await expect(
    agentPage.getByText(/verification is intentionally quiet/i)
  ).toBeVisible();
  await expect(
    agentPage.getByText(/stay in yes \/ no \/ edit mode/i)
  ).toBeVisible();
  await expect(agentPage.getByText(/current launch state/i)).toBeVisible();
  await expect(
    agentPage.getByText(/how do you usually structure your fees\?/i)
  ).toBeVisible();
  await expect(
    agentPage.getByText(/what is your typical property value band\?/i)
  ).toBeVisible();
  await expect(
    agentPage.getByText(/how open are you to jv or referral-style collaborations\?/i)
  ).toBeVisible();
  await expect(
    agentPage.getByText(/how quickly do you usually respond to new leads\?/i)
  ).toBeVisible();
});

test("mobile onboarding keeps upload hero and publish gate readable", async ({
  page
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const runId = `${Date.now()}-${test.info().workerIndex}-mobile`;
  const email = `qa-onboarding-mobile-${runId}@example.test`;

  const agentPage = await signInAsAgent(page, {
    email,
    fullName: `QA Mobile ${runId}`
  });

  await expect(
    agentPage.getByRole("heading", { name: /let's build your whoma profile/i })
  ).toBeVisible();
  await expect(
    agentPage.getByRole("button", { name: /upload cv \/ resume/i })
  ).toBeVisible();
  await expect(
    agentPage.getByRole("heading", {
      name: /answer only what the draft still needs/i
    })
  ).toBeVisible();
  await expect(
    agentPage.getByText("Step 5 · Publish gate", { exact: true })
  ).toBeVisible();
});
