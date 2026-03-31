import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { assertCan } from "@/lib/auth/rbac";
import { proposalSubmissionSchema } from "@/lib/validation/proposal";
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
  getMarketplaceHttpStatus,
  MarketplaceServiceError,
  submitProposalForAgent
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
      "Role onboarding required before submitting proposals."
    );
  }

  if (session.user.role !== "AGENT") {
    return jsonError(
      403,
      "FORBIDDEN_ROLE",
      "Only real estate agents can submit proposals."
    );
  }

  assertCan(session.user.role, "proposal:submit");

  const clientIp = clientIpFromRequestHeaders(request.headers);
  const rateLimitResult = await checkRateLimit({
    scope: "proposal:submit",
    actorId: session.user.id,
    clientIp,
    config: {
      limit: 40,
      windowMs: 60 * 60 * 1000
    }
  });

  if (!rateLimitResult.ok) {
    return jsonError(
      429,
      "RATE_LIMITED",
      "Too many proposal submissions. Please retry later.",
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

  const parsed = proposalSubmissionSchema.safeParse(body);

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
      route: "/api/proposals",
      idempotencyKey: request.headers.get("idempotency-key"),
      requestHash: createRequestHash(parsed.data),
      operation: async () => {
        const proposal = await submitProposalForAgent(
          session.user.id,
          parsed.data
        );

        return {
          status: 201,
          body: {
            actor: { id: session.user.id, role: session.user.role },
            proposal
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

    console.error("Proposal submit failed unexpectedly", error);
    return jsonError(
      500,
      "INTERNAL_ERROR",
      "Unexpected server error.",
      undefined,
      rateLimitHeaders(rateLimitResult)
    );
  }
}
