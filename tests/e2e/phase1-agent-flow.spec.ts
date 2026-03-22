import { expect, type Page, test } from "@playwright/test";

const previewRoleMetadata = {
  AGENT: {
    redirectPath: "/agent/onboarding"
  },
  ADMIN: {
    redirectPath: "/admin/agents"
  }
} as const;

async function signInAsPreviewRole(page: Page, role: keyof typeof previewRoleMetadata, email: string): Promise<Page> {
  const previewRole = previewRoleMetadata[role];
  const csrfResponse = await page.request.get("/api/auth/csrf");
  expect(csrfResponse.ok()).toBeTruthy();

  const csrfPayload = (await csrfResponse.json()) as { csrfToken?: string };
  expect(csrfPayload.csrfToken).toBeTruthy();

  const signInResponse = await page.request.post("/api/auth/callback/preview", {
    headers: {
      "X-Auth-Return-Redirect": "1"
    },
    form: {
      callbackUrl: previewRole.redirectPath,
      csrfToken: csrfPayload.csrfToken ?? "",
      email,
      role
    }
  });

  expect(signInResponse.ok()).toBeTruthy();

  const authenticatedPage = await page.context().newPage();
  await authenticatedPage.goto(previewRole.redirectPath, { waitUntil: "domcontentloaded" });
  return authenticatedPage;
}

test.describe.configure({ timeout: 120_000 });

test("phase 1 agent flow covers onboarding, CV publish, and admin verification", async ({ page }) => {
  const runId = `${Date.now()}-${test.info().workerIndex}`;
  const fullName = `QA Agent ${runId}`;
  const workEmail = `qa-agent-${runId}@example.test`;
  const phone = `+44 20 7946 ${runId.slice(-4)}`;
  const agencyName = `QA Estates ${runId}`;
  const jobTitle = "Senior Sales Negotiator";
  const bio =
    "I help homeowners market confidently with clear pricing advice, strong presentation, and calm communication from first briefing through completion.";
  const serviceAreas = "SW1A, SE1";
  const specialties = "Prime sales, Family homes";
  const achievements = "Trusted local adviser, Strong vendor communication";
  const languages = "English, French";

  const agentPage = await signInAsPreviewRole(page, "AGENT", workEmail);
  await expect(agentPage.getByRole("heading", { name: /real estate agent onboarding/i })).toBeVisible();

  await agentPage.getByLabel("Full name").fill(fullName);
  await agentPage.getByLabel("Work email for verification").fill(workEmail);

  await Promise.all([
    agentPage.waitForURL(/success=work_email_code_sent/),
    agentPage.getByRole("button", { name: /send verification code/i }).click()
  ]);

  const codeSentUrl = new URL(agentPage.url());
  const devCode = codeSentUrl.searchParams.get("devCode");
  expect(devCode).toBeTruthy();

  await agentPage.getByLabel("Verification code").fill(devCode ?? "");
  await Promise.all([
    agentPage.waitForURL(/success=work_email_verified/),
    agentPage.getByRole("button", { name: /verify work email/i }).click()
  ]);

  await agentPage.getByLabel("Full name").fill(fullName);
  await agentPage.getByRole("textbox", { name: "Work email", exact: true }).fill(workEmail);
  await agentPage.getByLabel("Phone").fill(phone);
  await agentPage.getByLabel("Agency").fill(agencyName);
  await agentPage.getByLabel("Job title").fill(jobTitle);
  await agentPage.getByLabel("Years experience").fill("8");
  await agentPage.getByLabel(/service areas/i).fill(serviceAreas);
  await agentPage.getByLabel(/specialties/i).fill(specialties);
  await agentPage.getByLabel(/professional summary/i).fill(bio);

  await Promise.all([
    agentPage.waitForURL(/\/agent\/profile\/edit\?success=onboarding-complete/),
    agentPage.getByRole("button", { name: /save onboarding details/i }).click()
  ]);

  await expect(agentPage.getByRole("heading", { name: /agent cv builder/i })).toBeVisible();

  await agentPage.getByLabel("Agency").fill(agencyName);
  await agentPage.getByLabel("Job title").fill(jobTitle);
  await agentPage.getByLabel("Work email").fill(workEmail);
  await agentPage.getByLabel("Phone").fill(phone);
  await agentPage.getByLabel("Years experience").fill("8");
  await agentPage.getByLabel(/service areas/i).fill(serviceAreas);
  await agentPage.getByLabel(/specialties/i).fill(specialties);
  await agentPage.getByLabel(/professional summary/i).fill(bio);
  await agentPage.getByLabel("Achievements").fill(achievements);
  await agentPage.getByLabel("Languages").fill(languages);

  await Promise.all([
    agentPage.waitForURL(/success=draft-saved/),
    agentPage.getByRole("button", { name: /save draft/i }).click()
  ]);
  await expect(agentPage.getByText(/draft saved successfully/i)).toBeVisible();

  await Promise.all([
    agentPage.waitForURL(/success=published/),
    agentPage.getByRole("button", { name: /publish profile/i }).click()
  ]);
  await expect(agentPage.getByText(/profile published\./i)).toBeVisible();

  const publishedUrl = new URL(agentPage.url());
  const slug = publishedUrl.searchParams.get("slug");
  expect(slug).toBeTruthy();

  const publicPage = await agentPage.context().newPage();
  const preVerificationResponse = await publicPage.goto(`/agents/${slug}`, {
    waitUntil: "domcontentloaded"
  });
  expect(preVerificationResponse?.status()).toBe(404);

  const adminEmail = `qa-admin-${runId}@example.test`;
  const adminPage = await signInAsPreviewRole(page, "ADMIN", adminEmail);
  await expect(adminPage.getByRole("heading", { name: /real estate agent verification/i })).toBeVisible();

  const agentRow = adminPage.locator("li", { hasText: fullName });
  await expect(agentRow).toBeVisible();

  await agentRow.getByRole("button", { name: /mark verified/i }).click();
  await expect(adminPage.getByText(/verification status updated/i)).toBeVisible();

  await adminPage.goto("/agents?verified=true", { waitUntil: "domcontentloaded" });
  await expect(adminPage.getByRole("heading", { name: /find verified real estate agents building personal credibility/i })).toBeVisible();
  await expect(adminPage.getByText(fullName)).toBeVisible();

  await publicPage.goto(`/agents/${slug}`, { waitUntil: "domcontentloaded" });
  await expect(publicPage.getByRole("heading", { name: new RegExp(fullName, "i") })).toBeVisible();
  await expect(publicPage.getByText(/^VERIFIED$/)).toBeVisible();

  await adminPage.close();
  await publicPage.close();
});
