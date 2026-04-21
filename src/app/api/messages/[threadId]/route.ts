import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { assertCan } from "@/lib/auth/rbac";
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
  createMessageForParticipant,
  getMarketplaceHttpStatus,
  getMessageThreadForParticipant,
  MarketplaceServiceError
} from "@/server/marketplace/service";

const createMessageSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Message body is required.")
    .max(2_000, "Message body must be 2000 characters or fewer.")
});

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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ threadId: string }> }
): Promise<Response> {
  const { threadId } = await params;
  const session = await auth();

  if (!session?.user) {
    return jsonError(401, "UNAUTHENTICATED", "Authentication required.");
  }

  if (!session.user.role) {
    return jsonError(
      403,
      "ROLE_REQUIRED",
      "Role onboarding required before viewing messages."
    );
  }

  assertCan(session.user.role, "thread:view");

  const clientIp = clientIpFromRequestHeaders(request.headers);
  const rateLimitResult = await checkRateLimit({
    scope: "thread:view",
    actorId: session.user.id,
    clientIp,
    config: {
      limit: 240,
      windowMs: 60 * 60 * 1000
    }
  });

  if (!rateLimitResult.ok) {
    return jsonError(
      429,
      "RATE_LIMITED",
      "Too many message thread requests. Please retry later.",
      { retryAfterSeconds: rateLimitResult.retryAfterSeconds },
      {
        ...rateLimitHeaders(rateLimitResult),
        "Retry-After": String(rateLimitResult.retryAfterSeconds)
      }
    );
  }

  try {
    const thread = await getMessageThreadForParticipant(session.user.id, threadId);

    return jsonSuccess(
      200,
      {
        actor: { id: session.user.id, role: session.user.role },
        thread
      },
      rateLimitHeaders(rateLimitResult)
    );
  } catch (error) {
    if (error instanceof MarketplaceServiceError) {
      return jsonError(
        getMarketplaceHttpStatus(error.code),
        error.code,
        error.message,
        error.details,
        rateLimitHeaders(rateLimitResult)
      );
    }

    console.error("Message thread read failed unexpectedly", error);
    return jsonError(
      500,
      "INTERNAL_ERROR",
      "Unexpected server error.",
      undefined,
      rateLimitHeaders(rateLimitResult)
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ threadId: string }> }
): Promise<Response> {
  const { threadId } = await params;
  const session = await auth();

  if (!session?.user) {
    return jsonError(401, "UNAUTHENTICATED", "Authentication required.");
  }

  if (!session.user.role) {
    return jsonError(
      403,
      "ROLE_REQUIRED",
      "Role onboarding required before sending messages."
    );
  }

  assertCan(session.user.role, "thread:message");

  const clientIp = clientIpFromRequestHeaders(request.headers);
  const rateLimitResult = await checkRateLimit({
    scope: "thread:message",
    actorId: session.user.id,
    clientIp,
    config: {
      limit: 120,
      windowMs: 60 * 60 * 1000
    }
  });

  if (!rateLimitResult.ok) {
    return jsonError(
      429,
      "RATE_LIMITED",
      "Too many message send attempts. Please retry later.",
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

  const parsed = createMessageSchema.safeParse(body);

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
      route: "/api/messages/[threadId]",
      idempotencyKey: request.headers.get("idempotency-key"),
      requestHash: createRequestHash({
        threadId,
        body: parsed.data.body
      }),
      operation: async () => {
        const message = await createMessageForParticipant(
          session.user.id,
          threadId,
          parsed.data.body
        );

        return {
          status: 201,
          body: {
            actor: { id: session.user.id, role: session.user.role },
            message
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

    console.error("Message send failed unexpectedly", error);
    return jsonError(
      500,
      "INTERNAL_ERROR",
      "Unexpected server error.",
      undefined,
      rateLimitHeaders(rateLimitResult)
    );
  }
}
