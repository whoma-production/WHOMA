import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { assertCan } from "@/lib/auth/rbac";
import {
  checkRateLimit,
  clientIpFromRequestHeaders
} from "@/server/http/rate-limit";
import {
  getMarketplaceHttpStatus,
  listMessageThreadsForParticipant,
  MarketplaceServiceError
} from "@/server/marketplace/service";

const threadListQuerySchema = z.object({
  instructionId: z.string().trim().min(1).max(100).optional()
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

export async function GET(request: Request): Promise<Response> {
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
    scope: "thread:list",
    actorId: session.user.id,
    clientIp,
    config: {
      limit: 180,
      windowMs: 60 * 60 * 1000
    }
  });

  if (!rateLimitResult.ok) {
    return jsonError(
      429,
      "RATE_LIMITED",
      "Too many message thread list requests. Please retry later.",
      { retryAfterSeconds: rateLimitResult.retryAfterSeconds },
      {
        ...rateLimitHeaders(rateLimitResult),
        "Retry-After": String(rateLimitResult.retryAfterSeconds)
      }
    );
  }

  const url = new URL(request.url);
  const parsedQuery = threadListQuerySchema.safeParse({
    instructionId: url.searchParams.get("instructionId") ?? undefined
  });

  if (!parsedQuery.success) {
    return jsonError(
      400,
      "VALIDATION_FAILED",
      "Validation failed.",
      parsedQuery.error.flatten(),
      rateLimitHeaders(rateLimitResult)
    );
  }

  try {
    const filters = parsedQuery.data.instructionId
      ? { instructionId: parsedQuery.data.instructionId }
      : {};

    const threads = await listMessageThreadsForParticipant(
      session.user.id,
      filters
    );

    return jsonSuccess(
      200,
      {
        actor: { id: session.user.id, role: session.user.role },
        threads
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

    console.error("Message thread list failed unexpectedly", error);
    return jsonError(
      500,
      "INTERNAL_ERROR",
      "Unexpected server error.",
      undefined,
      rateLimitHeaders(rateLimitResult)
    );
  }
}
