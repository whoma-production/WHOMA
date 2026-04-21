import { describe, expect, it } from "vitest";

import {
  createRequestHash,
  executeIdempotentRequest,
  getIdempotencyErrorStatus,
  IdempotencyError
} from "@/server/http/idempotency";

describe("idempotency", () => {
  it("creates deterministic hashes for identical payloads", () => {
    const payload = {
      instructionId: "ins_1",
      feeModel: "FIXED",
      feeValue: 1200
    };

    const a = createRequestHash(payload);
    const b = createRequestHash(payload);
    expect(a).toBe(b);
  });

  it("maps idempotency errors to expected HTTP statuses", () => {
    expect(getIdempotencyErrorStatus("MISSING_IDEMPOTENCY_KEY")).toBe(400);
    expect(getIdempotencyErrorStatus("INVALID_IDEMPOTENCY_KEY")).toBe(400);
    expect(
      getIdempotencyErrorStatus("IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD")
    ).toBe(409);
    expect(getIdempotencyErrorStatus("IDEMPOTENCY_REQUEST_IN_PROGRESS")).toBe(
      409
    );
  });

  it("fails fast when idempotency key is missing", async () => {
    await expect(
      executeIdempotentRequest({
        actorId: "user_1",
        route: "/api/test",
        idempotencyKey: null,
        requestHash: "abc",
        operation: async () => ({ status: 201, body: { ok: true } })
      })
    ).rejects.toMatchObject({
      code: "MISSING_IDEMPOTENCY_KEY"
    } satisfies Partial<IdempotencyError>);
  });
});
