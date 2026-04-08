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
    fullName: "Maya Green"
  });

  await expect(agentPage.getByRole("heading", { name: /let's build your whoma profile/i })).toBeVisible();
  await expect(agentPage.getByRole("button", { name: /upload cv \/ resume/i })).toBeVisible();
  await expect(agentPage.getByText("Upload", { exact: true })).toBeVisible();
  await expect(agentPage.getByText("Parse", { exact: true })).toBeVisible();
  await expect(agentPage.getByText("Review", { exact: true })).toBeVisible();
  await expect(agentPage.getByText("Fill gaps", { exact: true })).toBeVisible();
  await expect(agentPage.getByText("Publish and share", { exact: true })).toBeVisible();

  await expect(agentPage.getByText(/your whoma profile preview/i)).toBeVisible();
  await expect(
    agentPage.getByRole("heading", { name: "Finish your profile", exact: true })
  ).toBeVisible();
  await expect(agentPage.getByRole("heading", { name: /email verification/i })).toBeVisible();
  await expect(agentPage.getByText(/publish gate/i)).toBeVisible();
  await expect(agentPage.getByText(/verification stays quiet until publish/i)).toBeVisible();
  await expect(agentPage.getByText(/still needed to publish/i)).toBeVisible();
  await expect(agentPage.getByText(/recommended improvements/i)).toBeVisible();
});

test("mobile onboarding keeps upload hero and publish gate readable", async ({
  page
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const runId = `${Date.now()}-${test.info().workerIndex}-mobile`;
  const email = `qa-onboarding-mobile-${runId}@example.test`;

  const agentPage = await signInAsAgent(page, {
    email,
    fullName: "Asha Patel"
  });

  await expect(agentPage.getByRole("heading", { name: /let's build your whoma profile/i })).toBeVisible();
  await expect(agentPage.getByRole("button", { name: /upload cv \/ resume/i })).toBeVisible();
  await expect(agentPage.getByRole("heading", { name: "Finish your profile", exact: true })).toBeVisible();
  await expect(agentPage.getByText(/publish gate/i)).toBeVisible();
});
