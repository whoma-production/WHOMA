import { beforeEach, describe, expect, it, vi } from "vitest";

type MockIdempotencyRow = {
  actorId: string;
  route: string;
  key: string;
  requestHash: string;
  responseStatus: number;
  responseBody: Record<string, unknown>;
  expiresAt: Date;
};

const prismaState = vi.hoisted(() => {
  let row: MockIdempotencyRow | null = null;

  function matchesCompositeWhere(input: {
    where: {
      actorId_route_key: {
        actorId: string;
        route: string;
        key: string;
      };
    };
  }): boolean {
    return Boolean(
      row &&
        row.actorId === input.where.actorId_route_key.actorId &&
        row.route === input.where.actorId_route_key.route &&
        row.key === input.where.actorId_route_key.key
    );
  }

  return {
    reset() {
      row = null;
    },
    getRow() {
      return row;
    },
    idempotencyKey: {
      findUnique: vi.fn(async (input: {
        where: {
          actorId_route_key: {
            actorId: string;
            route: string;
            key: string;
          };
        };
      }) => (matchesCompositeWhere(input) ? row : null)),
      create: vi.fn(async (input: { data: MockIdempotencyRow }) => {
        if (row) {
          throw new Error("duplicate idempotency row");
        }

        row = { ...input.data };
        return row;
      }),
      update: vi.fn(async (input: {
        where: {
          actorId_route_key: {
            actorId: string;
            route: string;
            key: string;
          };
        };
        data: Partial<MockIdempotencyRow>;
      }) => {
        if (!matchesCompositeWhere(input) || !row) {
          throw new Error("missing idempotency row");
        }

        row = {
          ...row,
          ...input.data
        };

        return row;
      }),
      delete: vi.fn(async (input: {
        where: {
          actorId_route_key: {
            actorId: string;
            route: string;
            key: string;
          };
        };
      }) => {
        if (!matchesCompositeWhere(input) || !row) {
          throw new Error("missing idempotency row");
        }

        const deleted = row;
        row = null;
        return deleted;
      })
    }
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    idempotencyKey: prismaState.idempotencyKey
  }
}));

vi.mock("@/server/http/upstash", () => ({
  isUpstashConfigured: () => false,
  runUpstashCommand: vi.fn()
}));

import {
  createRequestHash,
  executeIdempotentRequest,
  getIdempotencyErrorStatus,
  IdempotencyError
} from "@/server/http/idempotency";

function createDeferredGate(): {
  promise: Promise<void>;
  resolve: () => void;
} {
  let resolve: () => void = () => undefined;

  const promise = new Promise<void>((innerResolve) => {
    resolve = () => innerResolve();
  });

  return {
    promise,
    resolve
  };
}

describe("idempotency", () => {
  beforeEach(() => {
    prismaState.reset();
    prismaState.idempotencyKey.findUnique.mockClear();
    prismaState.idempotencyKey.create.mockClear();
    prismaState.idempotencyKey.update.mockClear();
    prismaState.idempotencyKey.delete.mockClear();
  });

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

  it("blocks concurrent Prisma fallback requests while the first one is pending", async () => {
    const gate = createDeferredGate();

    const operation = vi.fn(async () => {
      await gate.promise;

      return {
        status: 201,
        body: { ok: true }
      };
    });

    const firstRequest = executeIdempotentRequest({
      actorId: "user_1",
      route: "/api/test",
      idempotencyKey: "pending-key",
      requestHash: "hash-1",
      operation
    });

    await Promise.resolve();
    await Promise.resolve();

    await expect(
      executeIdempotentRequest({
        actorId: "user_1",
        route: "/api/test",
        idempotencyKey: "pending-key",
        requestHash: "hash-1",
        operation
      })
    ).rejects.toMatchObject({
      code: "IDEMPOTENCY_REQUEST_IN_PROGRESS"
    } satisfies Partial<IdempotencyError>);

    expect(operation).toHaveBeenCalledTimes(1);
    expect(prismaState.getRow()?.responseStatus).toBe(102);

    gate.resolve();

    await expect(firstRequest).resolves.toMatchObject({
      status: 201,
      body: { ok: true },
      replayed: false
    });
    expect(prismaState.getRow()?.responseStatus).toBe(201);
  });

  it("clears the Prisma fallback reservation when the operation fails", async () => {
    let attempts = 0;

    const operation = vi.fn(async () => {
      attempts += 1;

      if (attempts === 1) {
        throw new Error("boom");
      }

      return {
        status: 201,
        body: { ok: true }
      };
    });

    await expect(
      executeIdempotentRequest({
        actorId: "user_1",
        route: "/api/test",
        idempotencyKey: "retry-key",
        requestHash: "hash-2",
        operation
      })
    ).rejects.toThrow("boom");

    expect(prismaState.getRow()).toBeNull();

    await expect(
      executeIdempotentRequest({
        actorId: "user_1",
        route: "/api/test",
        idempotencyKey: "retry-key",
        requestHash: "hash-2",
        operation
      })
    ).resolves.toMatchObject({
      status: 201,
      body: { ok: true },
      replayed: false
    });

    expect(operation).toHaveBeenCalledTimes(2);
  });
});
