import { describe, expect, it } from "vitest";

import {
  buildSupabaseAuthCallbackPath,
  hasSupabaseAuthReturnParams
} from "@/lib/auth/callback-return";

describe("auth callback return helpers", () => {
  it("detects stray code params on public routes", () => {
    expect(
      hasSupabaseAuthReturnParams({
        code: "abc123"
      })
    ).toBe(true);
  });

  it("builds a callback path from code and next params", () => {
    expect(
      buildSupabaseAuthCallbackPath({
        code: "abc123",
        next: "/agent/onboarding"
      })
    ).toBe("/auth/callback?code=abc123&next=%2Fagent%2Fonboarding");
  });

  it("preserves token-hash callback params", () => {
    expect(
      buildSupabaseAuthCallbackPath({
        token_hash: "hash123",
        type: "magiclink"
      })
    ).toBe("/auth/callback?token_hash=hash123&type=magiclink");
  });
});
