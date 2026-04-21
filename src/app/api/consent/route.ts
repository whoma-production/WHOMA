import { NextResponse } from "next/server";
import { z } from "zod";

import {
  COOKIE_CONSENT_COOKIE_NAME,
  COOKIE_CONSENT_MAX_AGE_SECONDS,
  decodeCookieConsentCookie,
  defaultCookieConsentPreferences,
  encodeCookieConsentCookie,
  parseCookieValueFromHeader,
  type CookieConsentPreferences
} from "@/server/consent/cookie-consent";

const consentUpdateSchema = z
  .object({
    mode: z.enum(["essential_only", "accept_all", "custom"]).optional(),
    analytics: z.boolean().optional(),
    preferences: z.boolean().optional()
  })
  .strict();

function jsonError(status: number, code: string, message: string, details?: unknown): Response {
  return NextResponse.json(
    {
      ok: false,
      error: { code, message, details }
    },
    { status }
  );
}

function jsonSuccess(status: number, data: unknown): Response {
  return NextResponse.json(
    {
      ok: true,
      data
    },
    { status }
  );
}

function setConsentCookie(response: NextResponse, value: CookieConsentPreferences): void {
  response.cookies.set({
    name: COOKIE_CONSENT_COOKIE_NAME,
    value: encodeCookieConsentCookie(value),
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_CONSENT_MAX_AGE_SECONDS
  });
}

function clearConsentCookie(response: NextResponse): void {
  response.cookies.set({
    name: COOKIE_CONSENT_COOKIE_NAME,
    value: "",
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
}

function resolvePreferences(input: z.infer<typeof consentUpdateSchema>): CookieConsentPreferences {
  if (input.mode === "accept_all") {
    return {
      version: 1,
      essential: true,
      analytics: true,
      preferences: true,
      decidedAtIso: new Date().toISOString()
    };
  }

  if (input.mode === "essential_only") {
    return {
      version: 1,
      essential: true,
      analytics: false,
      preferences: false,
      decidedAtIso: new Date().toISOString()
    };
  }

  return {
    version: 1,
    essential: true,
    analytics: input.analytics ?? false,
    preferences: input.preferences ?? false,
    decidedAtIso: new Date().toISOString()
  };
}

export async function GET(request: Request): Promise<Response> {
  const rawCookie = parseCookieValueFromHeader(
    request.headers.get("cookie"),
    COOKIE_CONSENT_COOKIE_NAME
  );
  const decoded = decodeCookieConsentCookie(rawCookie);

  return jsonSuccess(200, {
    hasStoredPreference: decoded !== null,
    preferences: decoded ?? defaultCookieConsentPreferences()
  });
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Invalid JSON body.");
  }

  const parsed = consentUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "VALIDATION_FAILED", "Consent payload is invalid.", parsed.error.flatten());
  }

  const preferences = resolvePreferences(parsed.data);
  const response = NextResponse.json(
    {
      ok: true,
      data: {
        preferences,
        hasStoredPreference: true
      }
    },
    { status: 200 }
  );

  setConsentCookie(response, preferences);
  return response;
}

export async function DELETE(): Promise<Response> {
  const response = NextResponse.json(
    {
      ok: true,
      data: {
        cleared: true
      }
    },
    { status: 200 }
  );
  clearConsentCookie(response);
  return response;
}

