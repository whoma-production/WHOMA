import { expect, type Page } from "@playwright/test";

import { prisma } from "../../../src/lib/prisma";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const supabaseURL = process.env.PLAYWRIGHT_SUPABASE_URL ?? "http://127.0.0.1:54321";

function getSupabaseStorageKey(): string {
  const url = new URL(supabaseURL);
  return `sb-${url.hostname.split(".")[0]}-auth-token`;
}

function encodeSession(session: Record<string, unknown>): string {
  return `base64-${Buffer.from(JSON.stringify(session), "utf8").toString("base64url")}`;
}

function createFakeAccessToken(seed: MockAuthSeed): string {
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" }),
    "utf8"
  ).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      sub: `mock-${seed.email}`,
      aud: "authenticated",
      role: "authenticated",
      email: seed.email,
      exp: issuedAt + 3600,
      iat: issuedAt,
      user_metadata: {
        full_name: seed.fullName,
        name: seed.fullName
      }
    }),
    "utf8"
  ).toString("base64url");

  return `${header}.${payload}.signature`;
}

export interface MockAuthSeed {
  email: string;
  fullName: string;
  accessToken?: string;
  refreshToken?: string;
}

export async function seedMockSupabaseSession(
  page: Page,
  seed: MockAuthSeed
): Promise<void> {
  const issuedAt = Math.floor(Date.now() / 1000);
  const accessToken = seed.accessToken ?? createFakeAccessToken(seed);
  const refreshToken = seed.refreshToken ?? `refresh-${seed.email}`;

  await page.request.post(`${supabaseURL}/register`, {
    data: {
      accessToken,
      refreshToken,
      email: seed.email,
      fullName: seed.fullName
    }
  });

  await page.context().addCookies([
    {
      name: getSupabaseStorageKey(),
      value: encodeSession({
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: issuedAt + 3600,
        expires_in: 3600,
        token_type: "bearer",
        user: {
          id: `supabase-${seed.email}`,
          email: seed.email,
          email_confirmed_at: new Date().toISOString(),
          user_metadata: {
            full_name: seed.fullName,
            name: seed.fullName
          },
          app_metadata: {},
          aud: "authenticated",
          role: "authenticated"
        }
      }),
      url: baseURL
    }
  ]);
}

export async function signInAsAgent(
  page: Page,
  seed: MockAuthSeed
): Promise<Page> {
  await seedMockSupabaseSession(page, seed);

  await page.goto("/onboarding/role", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: /what brings you to whoma\?/i })
  ).toBeVisible();

  await prisma.user.update({
    where: { email: seed.email },
    data: { role: "AGENT" }
  });

  await page.goto("/agent/onboarding", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: /let's build your whoma profile/i })).toBeVisible();
  return page;
}
