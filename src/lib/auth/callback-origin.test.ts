import { afterEach, describe, expect, it, vi } from "vitest";

import { buildAuthCallbackUrl, resolveAuthOrigin } from "@/lib/auth/callback-origin";

describe("auth callback origin", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses explicitly configured callback origin first", () => {
    vi.stubEnv("NEXT_PUBLIC_AUTH_CALLBACK_ORIGIN", "https://app.whoma.co.uk");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://fallback.whoma.co.uk");

    expect(resolveAuthOrigin()).toBe("https://app.whoma.co.uk");
  });

  it("falls back to runtime origin when no env is configured", () => {
    vi.stubEnv("NEXT_PUBLIC_AUTH_CALLBACK_ORIGIN", "");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    vi.stubEnv("AUTH_URL", "");

    expect(
      resolveAuthOrigin({ fallbackOrigin: "https://whoma-web-production.up.railway.app" })
    ).toBe("https://whoma-web-production.up.railway.app");
  });

  it("avoids localhost callback origin in production when request origin is public", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_AUTH_CALLBACK_ORIGIN", "http://localhost:3000");

    expect(
      resolveAuthOrigin({ fallbackOrigin: "https://whoma-web-production.up.railway.app" })
    ).toBe("https://whoma-web-production.up.railway.app");
  });

  it("prefers the active public host over a different configured production host", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv(
      "NEXT_PUBLIC_AUTH_CALLBACK_ORIGIN",
      "https://whoma-production.up.railway.app"
    );

    expect(
      resolveAuthOrigin({ fallbackOrigin: "https://app.whoma.co.uk" })
    ).toBe("https://app.whoma.co.uk");
  });

  it("builds callback url with normalized next path", () => {
    vi.stubEnv("NEXT_PUBLIC_AUTH_CALLBACK_ORIGIN", "https://app.whoma.co.uk");

    expect(buildAuthCallbackUrl("/agent/onboarding")).toBe(
      "https://app.whoma.co.uk/auth/callback?next=%2Fagent%2Fonboarding"
    );
  });
});
