import { describe, expect, it } from "vitest";

import {
  decodeCookieConsentCookie,
  defaultCookieConsentPreferences,
  encodeCookieConsentCookie,
  parseCookieValueFromHeader
} from "@/server/consent/cookie-consent";

describe("cookie consent cookie helpers", () => {
  it("encodes and decodes a signed consent payload", () => {
    const input = defaultCookieConsentPreferences();
    const encoded = encodeCookieConsentCookie(input);
    const decoded = decodeCookieConsentCookie(encoded);

    expect(decoded).toEqual(input);
  });

  it("rejects a tampered payload", () => {
    const encoded = encodeCookieConsentCookie(defaultCookieConsentPreferences());
    const tampered = `${encoded}tampered`;
    const decoded = decodeCookieConsentCookie(tampered);

    expect(decoded).toBeNull();
  });

  it("parses cookie values from request headers", () => {
    const header = "a=1; whoma_cookie_consent=abc123; c=3";
    expect(parseCookieValueFromHeader(header, "whoma_cookie_consent")).toBe("abc123");
    expect(parseCookieValueFromHeader(header, "missing")).toBeUndefined();
  });
});

