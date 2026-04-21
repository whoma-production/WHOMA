import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "@/lib/auth/password-auth";

describe("password-auth", () => {
  it("hashes and verifies the same password", async () => {
    const password = "AgentPass1234";
    const hash = await hashPassword(password);

    await expect(verifyPassword(password, hash)).resolves.toBe(true);
    await expect(verifyPassword("wrong-password", hash)).resolves.toBe(false);
  });
});
