import fs from "node:fs/promises";
import path from "node:path";

import { chromium } from "playwright";

const baseUrl = process.env.SMOKE_BASE_URL ?? process.env.AUTH_URL ?? "http://localhost:3012";
const headed = process.env.SMOKE_HEADED === "1";
const allowRemotePreviewAuth = process.env.SMOKE_ALLOW_REMOTE_PREVIEW_AUTH === "1";
const runId = new Date().toISOString().replace(/[:.]/g, "-");
const outputDir = path.join(process.cwd(), "output", "playwright", "marketplace-smoke", runId);

function toDateTimeLocal(value) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  const hours = String(value.getHours()).padStart(2, "0");
  const minutes = String(value.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function assertPreviewAuthTargetIsSafe() {
  const targetUrl = new URL(baseUrl);
  const isLocalTarget =
    targetUrl.hostname === "localhost" ||
    targetUrl.hostname === "127.0.0.1";

  if (isLocalTarget || allowRemotePreviewAuth) {
    return;
  }

  throw new Error(
    [
      `Refusing preview-auth smoke sign-in against non-local target: ${baseUrl}.`,
      "Preview callback auth is reserved for local or explicitly approved internal environments.",
      "Use SMOKE_ALLOW_REMOTE_PREVIEW_AUTH=1 only for an internal non-production target."
    ].join(" ")
  );
}

async function signInAs(
  page,
  {
    previewEmail,
    role,
    redirectPath
  }
) {
  const csrfResponse = await page.request.get(`${baseUrl}/api/auth/csrf`);

  if (!csrfResponse.ok()) {
    throw new Error(`Unable to fetch auth CSRF token (${csrfResponse.status()})`);
  }

  const csrfPayload = await csrfResponse.json();
  const csrfToken = csrfPayload?.csrfToken;

  if (!csrfToken) {
    throw new Error("Auth CSRF token was missing from the response");
  }

  const signInResponse = await page.request.post(`${baseUrl}/api/auth/callback/preview`, {
    headers: {
      "X-Auth-Return-Redirect": "1"
    },
    form: {
      callbackUrl: redirectPath,
      csrfToken,
      email: previewEmail,
      role
    }
  });

  if (!signInResponse.ok()) {
    throw new Error(`Preview callback sign-in failed (${signInResponse.status()})`);
  }

  await page.goto(`${baseUrl}${redirectPath}`, {
    waitUntil: "networkidle",
    timeout: 20_000
  });
}

async function openReadyForm(page, pathName) {
  await page.goto(`${baseUrl}${pathName}`, { waitUntil: "networkidle" });
  await page.locator('form[data-form-ready="true"]').first().waitFor({
    state: "visible",
    timeout: 20_000
  });
}

async function run() {
  assertPreviewAuthTargetIsSafe();
  await fs.mkdir(outputDir, { recursive: true });

  const browser = await chromium.launch({ headless: !headed });

  try {
    const homeownerContext = await browser.newContext();
    const homeownerPage = await homeownerContext.newPage();

    await signInAs(homeownerPage, {
      previewEmail: "homeowner.smoke@whoma.local",
      role: "HOMEOWNER",
      redirectPath: "/homeowner/instructions"
    });
    await openReadyForm(homeownerPage, "/homeowner/instructions/new");

    await homeownerPage.getByLabel("Property address line 1").fill("12 Example Road");
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

    // Ensure created instruction is LIVE for proposal submission.
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
    await instructionSuccess.first().waitFor({ timeout: 20_000 });
    const instructionSuccessText = await instructionSuccess.first().innerText();
    const instructionMatch = instructionSuccessText.match(/Instruction\s+([A-Za-z0-9_-]+)/i);

    if (!instructionMatch?.[1]) {
      throw new Error(`Unable to parse instruction id from: ${instructionSuccessText}`);
    }

    const instructionId = instructionMatch[1];

    await homeownerPage.screenshot({
      path: path.join(outputDir, "homeowner-instruction-created.png"),
      fullPage: true
    });
    await homeownerContext.close();

    const agentContext = await browser.newContext();
    const agentPage = await agentContext.newPage();

    await signInAs(agentPage, {
      previewEmail: "agent.smoke@whoma.local",
      role: "AGENT",
      redirectPath: "/agent/marketplace"
    });
    await openReadyForm(
      agentPage,
      `/agent/marketplace/${instructionId}/proposal`
    );

    await agentPage.getByRole("button", { name: "Submit Proposal" }).click();

    const proposalSuccess = agentPage.locator("text=/Proposal sent successfully/i");
    const proposalFailure = agentPage.locator("text=/Proposal not submitted/i");

    await Promise.race([
      proposalSuccess.first().waitFor({ timeout: 20_000 }),
      proposalFailure.first().waitFor({ timeout: 20_000 })
    ]);

    if (await proposalFailure.first().isVisible()) {
      const failureHeading = await proposalFailure.first().innerText();
      const failureMessage = await agentPage
        .locator("text=/Server error|Validation|Network error/i")
        .first()
        .innerText()
        .catch(() => "Unknown proposal failure");
      throw new Error(`${failureHeading}: ${failureMessage}`);
    }

    const proposalMessage = await agentPage
      .locator("text=/is now submitted and waiting in the marketplace/i")
      .first()
      .innerText();
    const proposalMatch = proposalMessage.match(/Proposal\s+([A-Za-z0-9_-]+)/i);
    const proposalId = proposalMatch?.[1] ?? null;

    await agentPage.screenshot({
      path: path.join(outputDir, "agent-proposal-submitted.png"),
      fullPage: true
    });
    await agentContext.close();

    console.log(
      JSON.stringify(
        {
          ok: true,
          baseUrl,
          instructionId,
          proposalId,
          instructionSuccessText,
          proposalMessage,
          outputDir
        },
        null,
        2
      )
    );
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error?.stack ?? String(error));
  process.exit(1);
});
