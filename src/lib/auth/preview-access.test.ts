import { describe, expect, it } from "vitest";

import { isPreviewAccessEnabled } from "@/lib/auth/preview-access";

describe("isPreviewAccessEnabled", () => {
  it("disables preview auth in production even when the env flag is true", () => {
    expect(isPreviewAccessEnabled("production", "true")).toBe(false);
  });

  it("keeps preview auth available outside production unless explicitly turned off", () => {
    expect(isPreviewAccessEnabled("development", "true")).toBe(true);
    expect(isPreviewAccessEnabled("test", undefined)).toBe(true);
  });

  it("respects an explicit false flag outside production", () => {
    expect(isPreviewAccessEnabled("development", "false")).toBe(false);
  });
});
