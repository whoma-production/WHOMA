import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { assertCan } from "@/lib/auth/rbac";
import { createInstructionSchema } from "@/lib/validation/instruction";
import {
  createRequestHash,
  executeIdempotentRequest,
  getIdempotencyErrorStatus,
  IdempotencyError
} from "@/server/http/idempotency";
import {
  checkRateLimit,
  clientIpFromRequestHeaders
} from "@/server/http/rate-limit";
import {
  createInstructionForHomeowner,
  getMarketplaceHttpStatus,
  MarketplaceServiceError
} from "@/server/marketplace/service";

function jsonError(
  status: number,
  code: string,
  message: string,
  details?: unknown,
  headers?: HeadersInit
): Response {
  const init: ResponseInit = headers ? { status, headers } : { status };

  return NextResponse.json(
    {
      ok: false,
      error: { code, message, details }
    },
    init
  );
}

function jsonSuccess(
  status: number,
  data: unknown,
  headers?: HeadersInit
): Response {
  const init: ResponseInit = headers ? { status, headers } : { status };

  return NextResponse.json(
    {
      ok: true,
      data
    },
    init
  );
}

function rateLimitHeaders(limitResult: {
  limit: number;
  remaining: number;
  resetAtMs: number;
}): HeadersInit {
  return {
    "X-RateLimit-Limit": String(limitResult.limit),
    "X-RateLimit-Remaining": String(limitResult.remaining),
    "X-RateLimit-Reset": String(Math.ceil(limitResult.resetAtMs / 1000))
  };
}

export async function POST(request: Request): Promise<Response> {
  const session = await auth();

  if (!session?.user) {
    return jsonError(401, "UNAUTHENTICATED", "Authentication required.");
  }

  if (!session.user.role) {
    return jsonError(
      403,
      "ROLE_REQUIRED",
      "Role onboarding required before creating instructions."
    );
  }

  if (session.user.role !== "HOMEOWNER") {
    return jsonError(
      403,
      "FORBIDDEN_ROLE",
      "Only homeowners can create instructions."
    );
  }

  assertCan(session.user.role, "instruction:create");

  const clientIp = clientIpFromRequestHeaders(request.headers);
  const rateLimitResult = await checkRateLimit({
    scope: "instruction:create",
    actorId: session.user.id,
    clientIp,
    config: {
      limit: 10,
      windowMs: 60 * 60 * 1000
    }
  });

  if (!rateLimitResult.ok) {
    return jsonError(
      429,
      "RATE_LIMITED",
      "Too many instruction creation attempts. Please retry later.",
      { retryAfterSeconds: rateLimitResult.retryAfterSeconds },
      {
        ...rateLimitHeaders(rateLimitResult),
        "Retry-After": String(rateLimitResult.retryAfterSeconds)
      }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(
      400,
      "INVALID_JSON",
      "Invalid JSON body.",
      undefined,
      rateLimitHeaders(rateLimitResult)
    );
  }

  const parsed = createInstructionSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(
      400,
      "VALIDATION_FAILED",
      "Validation failed.",
      parsed.error.flatten(),
      rateLimitHeaders(rateLimitResult)
    );
  }

  try {
    const idempotent = await executeIdempotentRequest({
      actorId: session.user.id,
      route: "/api/instructions",
      idempotencyKey: request.headers.get("idempotency-key"),
      requestHash: createRequestHash(parsed.data),
      operation: async () => {
        const instruction = await createInstructionForHomeowner(
          session.user.id,
          parsed.data
        );

        return {
          status: 201,
          body: {
            actor: { id: session.user.id, role: session.user.role },
            instruction
          }
        };
      }
    });

    return jsonSuccess(idempotent.status, idempotent.body, {
      ...rateLimitHeaders(rateLimitResult),
      "Idempotency-Replayed": idempotent.replayed ? "true" : "false"
    });
  } catch (error) {
    if (error instanceof IdempotencyError) {
      return jsonError(
        getIdempotencyErrorStatus(error.code),
        error.code,
        error.message,
        undefined,
        rateLimitHeaders(rateLimitResult)
      );
    }

    if (error instanceof MarketplaceServiceError) {
      return jsonError(
        getMarketplaceHttpStatus(error.code),
        error.code,
        error.message,
        error.details,
        rateLimitHeaders(rateLimitResult)
      );
    }

    console.error("Instruction create failed unexpectedly", error);
    return jsonError(
      500,
      "INTERNAL_ERROR",
      "Unexpected server error.",
      undefined,
      rateLimitHeaders(rateLimitResult)
    );
  }
}
