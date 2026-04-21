import crypto from "node:crypto";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  isUpstashConfigured,
  runUpstashCommand
} from "@/server/http/upstash";

const DEFAULT_IDEMPOTENCY_TTL_SECONDS = 60 * 60 * 24;
const MAX_KEY_LENGTH = 128;
const ALLOWED_KEY_PATTERN = /^[a-zA-Z0-9._:-]+$/;

type JsonRecord = Record<string, unknown>;

type StoredPendingRecord = {
  state: "PENDING";
  requestHash: string;
};

type StoredCompletedRecord = {
  state: "COMPLETED";
  requestHash: string;
  responseStatus: number;
  responseBody: JsonRecord;
};

type StoredIdempotencyRecord = StoredPendingRecord | StoredCompletedRecord;

const PRISMA_PENDING_RESPONSE_STATUS = 102;
const PRISMA_PENDING_RESPONSE_BODY = {
  __whomaIdempotencyState: "PENDING"
} as const satisfies JsonRecord;

export type IdempotentResult<T extends JsonRecord> = {
  status: number;
  body: T;
  replayed: boolean;
};

export type IdempotentOperation<T extends JsonRecord> = () => Promise<{
  status: number;
  body: T;
}>;

export type IdempotencyErrorCode =
  | "MISSING_IDEMPOTENCY_KEY"
  | "INVALID_IDEMPOTENCY_KEY"
  | "IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD"
  | "IDEMPOTENCY_REQUEST_IN_PROGRESS";

export class IdempotencyError extends Error {
  readonly code: IdempotencyErrorCode;

  constructor(code: IdempotencyErrorCode, message: string) {
    super(message);
    this.name = "IdempotencyError";
    this.code = code;
  }
}

function assertIdempotencyKey(rawKey: string | null): string {
  if (!rawKey) {
    throw new IdempotencyError(
      "MISSING_IDEMPOTENCY_KEY",
      "Idempotency-Key header is required for this endpoint."
    );
  }

  const key = rawKey.trim();

  if (
    key.length < 8 ||
    key.length > MAX_KEY_LENGTH ||
    !ALLOWED_KEY_PATTERN.test(key)
  ) {
    throw new IdempotencyError(
      "INVALID_IDEMPOTENCY_KEY",
      "Idempotency-Key must be 8-128 characters using letters, numbers, ., _, :, or -."
    );
  }

  return key;
}

function toJsonRecord(value: unknown): JsonRecord {
  return JSON.parse(JSON.stringify(value)) as JsonRecord;
}

function storageKey(actorId: string, route: string, key: string): string {
  const routeHash = createRequestHash(route).slice(0, 16);
  return `whoma:idempotency:${actorId}:${routeHash}:${key}`;
}

function parseStoredRecord(raw: unknown): StoredIdempotencyRecord | null {
  if (raw === null || raw === undefined) {
    return null;
  }

  if (typeof raw !== "string") {
    throw new Error("Unexpected idempotency record format.");
  }

  const parsed = JSON.parse(raw) as unknown;

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof (parsed as Record<string, unknown>).state !== "string" ||
    typeof (parsed as Record<string, unknown>).requestHash !== "string"
  ) {
    throw new Error("Malformed idempotency record.");
  }

  const record = parsed as Record<string, unknown>;

  if (record.state === "PENDING") {
    return {
      state: "PENDING",
      requestHash: String(record.requestHash)
    };
  }

  if (
    record.state === "COMPLETED" &&
    typeof record.responseStatus === "number" &&
    typeof record.responseBody === "object" &&
    record.responseBody !== null
  ) {
    return {
      state: "COMPLETED",
      requestHash: String(record.requestHash),
      responseStatus: record.responseStatus,
      responseBody: record.responseBody as JsonRecord
    };
  }

  throw new Error("Malformed idempotency record.");
}

function resolveStoredRecord<T extends JsonRecord>(
  record: StoredIdempotencyRecord,
  requestHash: string
): IdempotentResult<T> {
  if (record.requestHash !== requestHash) {
    throw new IdempotencyError(
      "IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD",
      "This idempotency key was already used with a different request payload."
    );
  }

  if (record.state === "PENDING") {
    throw new IdempotencyError(
      "IDEMPOTENCY_REQUEST_IN_PROGRESS",
      "An identical request is still being processed. Please retry shortly."
    );
  }

  return {
    status: record.responseStatus,
    body: record.responseBody as T,
    replayed: true
  };
}

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parsePrismaStoredRecord(input: {
  requestHash: string;
  responseStatus: number;
  responseBody: Prisma.JsonValue;
}): StoredIdempotencyRecord {
  if (
    input.responseStatus === PRISMA_PENDING_RESPONSE_STATUS &&
    isJsonRecord(input.responseBody) &&
    input.responseBody.__whomaIdempotencyState === "PENDING"
  ) {
    return {
      state: "PENDING",
      requestHash: input.requestHash
    };
  }

  if (!isJsonRecord(input.responseBody)) {
    throw new Error("Malformed idempotency record.");
  }

  return {
    state: "COMPLETED",
    requestHash: input.requestHash,
    responseStatus: input.responseStatus,
    responseBody: input.responseBody
  };
}

export function createRequestHash(payload: unknown): string {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex");
}

export function getIdempotencyErrorStatus(code: IdempotencyErrorCode): number {
  switch (code) {
    case "MISSING_IDEMPOTENCY_KEY":
    case "INVALID_IDEMPOTENCY_KEY":
      return 400;
    case "IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD":
    case "IDEMPOTENCY_REQUEST_IN_PROGRESS":
      return 409;
  }
}

async function executeIdempotentRequestWithPrisma<T extends JsonRecord>(params: {
  actorId: string;
  route: string;
  key: string;
  requestHash: string;
  operation: IdempotentOperation<T>;
  ttlSeconds: number;
}): Promise<IdempotentResult<T>> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + params.ttlSeconds * 1000);

  const existing = await prisma.idempotencyKey.findUnique({
    where: {
      actorId_route_key: {
        actorId: params.actorId,
        route: params.route,
        key: params.key
      }
    }
  });

  if (existing && existing.expiresAt > now) {
    return resolveStoredRecord<T>(
      parsePrismaStoredRecord({
        requestHash: existing.requestHash,
        responseStatus: existing.responseStatus,
        responseBody: existing.responseBody
      }),
      params.requestHash
    );
  }

  if (existing && existing.expiresAt <= now) {
    await prisma.idempotencyKey.delete({
      where: {
        actorId_route_key: {
          actorId: params.actorId,
          route: params.route,
          key: params.key
        }
      }
    });
  }

  try {
    await prisma.idempotencyKey.create({
      data: {
        actorId: params.actorId,
        route: params.route,
        key: params.key,
        requestHash: params.requestHash,
        responseStatus: PRISMA_PENDING_RESPONSE_STATUS,
        responseBody: PRISMA_PENDING_RESPONSE_BODY,
        expiresAt
      }
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const raced = await prisma.idempotencyKey.findUnique({
        where: {
          actorId_route_key: {
            actorId: params.actorId,
            route: params.route,
            key: params.key
          }
        }
      });

      if (raced) {
        return resolveStoredRecord<T>(
          parsePrismaStoredRecord({
            requestHash: raced.requestHash,
            responseStatus: raced.responseStatus,
            responseBody: raced.responseBody
          }),
          params.requestHash
        );
      }
    }

    throw error;
  }

  try {
    const operationResult = await params.operation();
    const responseBodyRecord = toJsonRecord(operationResult.body);
    const responseBody = responseBodyRecord as Prisma.InputJsonValue;

    await prisma.idempotencyKey.update({
      where: {
        actorId_route_key: {
          actorId: params.actorId,
          route: params.route,
          key: params.key
        }
      },
      data: {
        responseStatus: operationResult.status,
        responseBody,
        expiresAt
      }
    });

    return {
      status: operationResult.status,
      body: responseBodyRecord as T,
      replayed: false
    };
  } catch (error) {
    await prisma.idempotencyKey
      .delete({
        where: {
          actorId_route_key: {
            actorId: params.actorId,
            route: params.route,
            key: params.key
          }
        }
      })
      .catch(() => undefined);

    throw error;
  }
}

async function executeIdempotentRequestWithUpstash<T extends JsonRecord>(params: {
  actorId: string;
  route: string;
  key: string;
  requestHash: string;
  operation: IdempotentOperation<T>;
  ttlSeconds: number;
}): Promise<IdempotentResult<T>> {
  const redisKey = storageKey(params.actorId, params.route, params.key);
  const existing = parseStoredRecord(await runUpstashCommand(["GET", redisKey]));

  if (existing) {
    return resolveStoredRecord<T>(existing, params.requestHash);
  }

  const pendingRecord: StoredPendingRecord = {
    state: "PENDING",
    requestHash: params.requestHash
  };

  const reserve = await runUpstashCommand([
    "SET",
    redisKey,
    JSON.stringify(pendingRecord),
    "NX",
    "EX",
    params.ttlSeconds
  ]);

  if (reserve !== "OK") {
    const raced = parseStoredRecord(await runUpstashCommand(["GET", redisKey]));

    if (raced) {
      return resolveStoredRecord<T>(raced, params.requestHash);
    }

    throw new IdempotencyError(
      "IDEMPOTENCY_REQUEST_IN_PROGRESS",
      "An identical request is still being processed. Please retry shortly."
    );
  }

  try {
    const operationResult = await params.operation();
    const responseBodyRecord = toJsonRecord(operationResult.body);

    const completedRecord: StoredCompletedRecord = {
      state: "COMPLETED",
      requestHash: params.requestHash,
      responseStatus: operationResult.status,
      responseBody: responseBodyRecord
    };

    await runUpstashCommand([
      "SET",
      redisKey,
      JSON.stringify(completedRecord),
      "EX",
      params.ttlSeconds
    ]);

    return {
      status: operationResult.status,
      body: responseBodyRecord as T,
      replayed: false
    };
  } catch (error) {
    await runUpstashCommand(["DEL", redisKey]);
    throw error;
  }
}

export async function executeIdempotentRequest<T extends JsonRecord>(params: {
  actorId: string;
  route: string;
  idempotencyKey: string | null;
  requestHash: string;
  operation: IdempotentOperation<T>;
  ttlSeconds?: number;
}): Promise<IdempotentResult<T>> {
  const key = assertIdempotencyKey(params.idempotencyKey);
  const ttlSeconds = params.ttlSeconds ?? DEFAULT_IDEMPOTENCY_TTL_SECONDS;

  if (isUpstashConfigured()) {
    try {
      return await executeIdempotentRequestWithUpstash({
        actorId: params.actorId,
        route: params.route,
        key,
        requestHash: params.requestHash,
        operation: params.operation,
        ttlSeconds
      });
    } catch (error) {
      if (error instanceof IdempotencyError) {
        throw error;
      }

      console.error("Upstash idempotency fallback to Prisma", error);
    }
  }

  return executeIdempotentRequestWithPrisma({
    actorId: params.actorId,
    route: params.route,
    key,
    requestHash: params.requestHash,
    operation: params.operation,
    ttlSeconds
  });
}
