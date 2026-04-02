import { expect, type Page, test } from "@playwright/test";

interface InstructionCreateResponse {
  ok?: boolean;
  data?: {
    actor?: {
      id?: string;
    };
    instruction?: {
      id?: string;
    };
  };
}

interface ProposalCreateResponse {
  ok?: boolean;
  data?: {
    proposal?: {
      id?: string;
    };
  };
}

async function ensureAuthCsrfReady(page: Page): Promise<void> {
  let lastStatus: number | null = null;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const csrfResponse = await page.request.get("/api/auth/csrf");
    lastStatus = csrfResponse.status();

    if (csrfResponse.ok()) {
      return;
    }

    await page.waitForTimeout(400);
  }

  throw new Error(
    `Unable to initialize auth csrf endpoint before preview sign-in. Last status: ${lastStatus ?? "unknown"}`
  );
}

async function signInAsPreviewRole(
  page: Page,
  role: "HOMEOWNER" | "AGENT",
  email: string
): Promise<Page> {
  await ensureAuthCsrfReady(page);

  const csrfResponse = await page.request.get("/api/auth/csrf");
  expect(csrfResponse.ok()).toBeTruthy();

  const csrfPayload = (await csrfResponse.json()) as { csrfToken?: string };
  expect(csrfPayload.csrfToken).toBeTruthy();

  const redirectPath =
    role === "HOMEOWNER" ? "/homeowner/instructions" : "/agent/onboarding";

  const signInResponse = await page.request.post("/api/auth/callback/preview", {
    headers: {
      "X-Auth-Return-Redirect": "1"
    },
    form: {
      callbackUrl: redirectPath,
      csrfToken: csrfPayload.csrfToken ?? "",
      email,
      role
    }
  });

  expect(signInResponse.ok()).toBeTruthy();

  const authenticatedPage = await page.context().newPage();
  await authenticatedPage.goto(redirectPath, { waitUntil: "networkidle" });

  const sessionResponse = await authenticatedPage.request.get("/api/auth/session");
  expect(sessionResponse.ok()).toBeTruthy();
  const session = (await sessionResponse.json()) as { user?: { role?: string | null } | null };
  expect(session.user?.role).toBe(role);

  return authenticatedPage;
}

function instructionPayload(): Record<string, unknown> {
  const now = new Date();
  now.setSeconds(0, 0);
  const bidWindowStartAt = new Date(now.getTime() - 60 * 60 * 1000);
  const bidWindowEndAt = new Date(
    bidWindowStartAt.getTime() + 24 * 60 * 60 * 1000
  );

  return {
    property: {
      addressLine1: "24 Garden Terrace",
      city: "London",
      postcode: "SW1A 1AA",
      propertyType: "FLAT",
      bedrooms: 2,
      shortDescription:
        "Bright two-bedroom flat with recent updates, chain-free seller, and excellent transport links."
    },
    sellerGoals:
      "Need realistic pricing advice, accompanied viewings, and proactive communication through completion.",
    targetTimeline: "ASAP",
    bidWindowStartAt: bidWindowStartAt.toISOString(),
    bidWindowEndAt: bidWindowEndAt.toISOString(),
    bidWindowHours: 24,
    mustHaves: ["Accompanied viewings", "Weekly reporting"]
  };
}

function proposalPayload(
  instructionId: string,
  variant: "value" | "speed"
): Record<string, unknown> {
  if (variant === "speed") {
    return {
      instructionId,
      feeModel: "FIXED",
      feeValue: 2300,
      currency: "GBP",
      inclusions: [
        "PORTAL_LISTINGS",
        "ACCOMPANIED_VIEWINGS",
        "SALES_PROGRESSION_SUPPORT"
      ],
      marketingPlan:
        "Premium portal placement in 24 hours, proactive social content, accompanied viewings, and rapid feedback loops.",
      timelineDays: 28,
      cancellationTerms:
        "28-day sole agency period with a seven-day written cancellation notice after the initial term."
    };
  }

  return {
    instructionId,
    feeModel: "FIXED",
    feeValue: 1650,
    currency: "GBP",
    inclusions: [
      "PORTAL_LISTINGS",
      "PROFESSIONAL_PHOTOGRAPHY",
      "ACCOMPANIED_VIEWINGS",
      "SALES_PROGRESSION_SUPPORT"
    ],
    marketingPlan:
      "Launch with premium listing presentation, staged photography, targeted local campaigns, and accompanied weekend viewings.",
    timelineDays: 42,
    cancellationTerms:
      "30-day sole agency period with a seven-day written cancellation notice after the initial term."
  };
}

async function createInstruction(
  page: Page,
  idempotencyKey: string
): Promise<{ instructionId: string; homeownerActorId: string }> {
  const response = await page.request.post("/api/instructions", {
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey
    },
    data: instructionPayload()
  });
  expect(response.ok()).toBeTruthy();

  const responseBody = (await response.json()) as InstructionCreateResponse;
  expect(responseBody.ok).toBeTruthy();
  const instructionId = responseBody.data?.instruction?.id;
  const homeownerActorId = responseBody.data?.actor?.id;
  expect(instructionId).toBeTruthy();
  expect(homeownerActorId).toBeTruthy();

  return {
    instructionId: instructionId ?? "",
    homeownerActorId: homeownerActorId ?? ""
  };
}

async function createProposal(
  page: Page,
  instructionId: string,
  idempotencyKey: string,
  variant: "value" | "speed"
): Promise<string> {
  const response = await page.request.post("/api/proposals", {
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey
    },
    data: proposalPayload(instructionId, variant)
  });
  expect(response.ok()).toBeTruthy();

  const responseBody = (await response.json()) as ProposalCreateResponse;
  expect(responseBody.ok).toBeTruthy();
  const proposalId = responseBody.data?.proposal?.id;
  expect(proposalId).toBeTruthy();

  return proposalId ?? "";
}

test.describe.configure({ timeout: 140_000 });

test("homeowner compare supports sort modes, ranking badges, shortlist multi-select, and choose flow", async ({
  page
}) => {
  const runId = `${Date.now()}-${test.info().workerIndex}`;
  const homeownerEmail = `qa-homeowner-${runId}@example.test`;
  const firstAgentEmail = `qa-agent-one-${runId}@example.test`;
  const secondAgentEmail = `qa-agent-two-${runId}@example.test`;

  const homeownerSetupPage = await signInAsPreviewRole(
    page,
    "HOMEOWNER",
    homeownerEmail
  );
  const { instructionId, homeownerActorId } = await createInstruction(
    homeownerSetupPage,
    `e2e-homeowner-instruction-${runId}`
  );
  await homeownerSetupPage.close();

  const firstAgentPage = await signInAsPreviewRole(page, "AGENT", firstAgentEmail);
  await createProposal(
    firstAgentPage,
    instructionId,
    `e2e-agent-one-proposal-${runId}`,
    "value"
  );
  await firstAgentPage.close();

  const secondAgentPage = await signInAsPreviewRole(page, "AGENT", secondAgentEmail);
  await createProposal(
    secondAgentPage,
    instructionId,
    `e2e-agent-two-proposal-${runId}`,
    "speed"
  );
  await secondAgentPage.close();

  const homeownerComparePage = await signInAsPreviewRole(
    page,
    "HOMEOWNER",
    homeownerEmail
  );
  const compareSessionResponse = await homeownerComparePage.request.get("/api/auth/session");
  expect(compareSessionResponse.ok()).toBeTruthy();
  const compareSession = (await compareSessionResponse.json()) as {
    user?: { id?: string | null; role?: string | null } | null;
  };
  expect(compareSession.user?.role).toBe("HOMEOWNER");
  expect(compareSession.user?.id).toBe(homeownerActorId);

  const compareResponse = await homeownerComparePage.goto(
    `/homeowner/instructions/${instructionId}/compare`,
    {
      waitUntil: "networkidle"
    }
  );
  expect(compareResponse?.status()).toBe(200);
  await homeownerComparePage.getByTestId("proposal-compare-table").waitFor({
    timeout: 20_000
  });

  await homeownerComparePage.getByRole("button", { name: "Lowest fee" }).click();
  await expect(
    homeownerComparePage.getByText(/prioritize the lowest headline fee first/i)
  ).toBeVisible();
  await homeownerComparePage.getByRole("button", { name: "Best local fit" }).click();
  await expect(
    homeownerComparePage.getByText(/prioritize verified local experience and area fit signals/i)
  ).toBeVisible();

  const compareTable = homeownerComparePage.getByTestId("proposal-compare-table");
  await expect(compareTable.getByText(/lowest fee/i).first()).toBeVisible();
  await expect(compareTable.getByText(/top value/i).first()).toBeVisible();

  const proposalStatusBadges = homeownerComparePage.locator(
    `[data-testid="proposal-status-badge"][data-proposal-status="SUBMITTED"]`
  );
  await expect(proposalStatusBadges).toHaveCount(2);

  const shortlistCheckboxes = homeownerComparePage.locator(
    'input[type="checkbox"][aria-label^="Select "]'
  );
  await shortlistCheckboxes.nth(0).check();
  await shortlistCheckboxes.nth(1).check();

  await homeownerComparePage
    .getByRole("button", { name: /Shortlist selected \(2\)/ })
    .click();
  await expect(homeownerComparePage.getByText(/2 offers shortlisted\./i)).toBeVisible({
    timeout: 20_000
  });

  await expect(
    homeownerComparePage.locator(
      `[data-testid="proposal-status-badge"][data-proposal-status="SHORTLISTED"]`
    )
  ).toHaveCount(2);

  const instructionStatusBadge = homeownerComparePage.getByTestId(
    "instruction-status-badge"
  );
  const messagingUnlockBadge = homeownerComparePage.getByTestId(
    "messaging-unlock-badge"
  );
  const openMessagesButton = homeownerComparePage.getByTestId(
    "open-messages-button"
  );
  await expect(instructionStatusBadge).toHaveAttribute(
    "data-instruction-status",
    "SHORTLIST"
  );
  await expect(messagingUnlockBadge).toHaveAttribute(
    "data-messaging-state",
    "OPEN"
  );
  await expect(openMessagesButton).toBeEnabled();

  await homeownerComparePage.getByRole("button", { name: /^Choose / }).first().click();
  await expect(
    homeownerComparePage.getByText(/has been chosen\./i)
  ).toBeVisible({ timeout: 20_000 });

  await expect(
    homeownerComparePage.locator(
      `[data-testid="proposal-status-badge"][data-proposal-status="ACCEPTED"]`
    )
  ).toHaveCount(1);

  await homeownerComparePage.reload({ waitUntil: "networkidle" });
  await expect(instructionStatusBadge).toHaveAttribute(
    "data-instruction-status",
    "AWARDED"
  );
  await expect(
    homeownerComparePage.locator(
      `[data-testid="proposal-status-badge"][data-proposal-status="ACCEPTED"]`
    )
  ).toHaveCount(1);

  await openMessagesButton.click();
  await homeownerComparePage.waitForURL(/\/messages/, { timeout: 20_000 });
  await expect(
    homeownerComparePage.getByRole("heading", { name: /^Messages$/ })
  ).toBeVisible();

  await homeownerComparePage.close();
});
