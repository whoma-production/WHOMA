import crypto from "node:crypto";

import { z } from "zod";

export const COOKIE_CONSENT_COOKIE_NAME = "whoma_cookie_consent";
export const COOKIE_CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

const cookieConsentSchema = z
  .object({
    version: z.literal(1),
    essential: z.literal(true),
    analytics: z.boolean(),
    preferences: z.boolean(),
    decidedAtIso: z.string().datetime()
  })
  .strict();

export type CookieConsentPreferences = z.infer<typeof cookieConsentSchema>;

function getConsentSecret(): string {
  return process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "whoma-cookie-consent";
}

function signPayload(serializedPayload: string): string {
  return crypto
    .createHmac("sha256", getConsentSecret())
    .update(serializedPayload)
    .digest("base64url");
}

export function defaultCookieConsentPreferences(): CookieConsentPreferences {
  return {
    version: 1,
    essential: true,
    analytics: false,
    preferences: false,
    decidedAtIso: new Date().toISOString()
  };
}

export function encodeCookieConsentCookie(input: CookieConsentPreferences): string {
  const parsed = cookieConsentSchema.parse(input);
  const serializedPayload = JSON.stringify(parsed);
  const payload = Buffer.from(serializedPayload, "utf8").toString("base64url");
  const signature = signPayload(serializedPayload);
  return `${signature}.${payload}`;
}

export function decodeCookieConsentCookie(rawValue: string | undefined): CookieConsentPreferences | null {
  if (!rawValue) {
    return null;
  }

  const separatorIndex = rawValue.indexOf(".");
  if (separatorIndex <= 0 || separatorIndex === rawValue.length - 1) {
    return null;
  }

  const signature = rawValue.slice(0, separatorIndex);
  const payload = rawValue.slice(separatorIndex + 1);

  let serializedPayload = "";
  try {
    serializedPayload = Buffer.from(payload, "base64url").toString("utf8");
  } catch {
    return null;
  }

  const expectedSignature = signPayload(serializedPayload);
  if (signature.length !== expectedSignature.length) {
    return null;
  }

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return null;
  }

  try {
    const parsed = JSON.parse(serializedPayload) as unknown;
    return cookieConsentSchema.parse(parsed);
  } catch {
    return null;
  }
}

export function parseCookieValueFromHeader(cookieHeader: string | null, cookieName: string): string | undefined {
  if (!cookieHeader) {
    return undefined;
  }

  const cookiePart = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName}=`));

  if (!cookiePart) {
    return undefined;
  }

  return cookiePart.slice(cookieName.length + 1);
}

