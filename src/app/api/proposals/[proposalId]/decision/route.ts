import { NextResponse } from "next/server";
import { z } from "zod";
import type { NextRequest } from "next/server";

import { auth } from "@/auth";
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
  decideProposalForHomeowner,
  getMarketplaceHttpStatus,
  MarketplaceServiceError
} from "@/server/marketplace/service";

const decisionSchema = z.object({
  action: z.enum(["SHORTLIST", "REJECT", "AWARD"])
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ proposalId: string }> }
): Promise<Response> {
  const { proposalId } = await params;
  const session = await auth();

  if (!session?.user) {
    return jsonError(401, "UNAUTHENTICATED", "Authentication required.");
  }

  if (!session.user.role) {
    return jsonError(
      403,
      "ROLE_REQUIRED",
      "Role onboarding required before reviewing proposals."
    );
  }

  if (session.user.role !== "HOMEOWNER") {
    return jsonError(
      403,
      "FORBIDDEN_ROLE",
      "Only homeowners can review proposal decisions."
    );
  }

  const clientIp = clientIpFromRequestHeaders(request.headers);
  const rateLimitResult = await checkRateLimit({
    scope: "proposal:decision",
    actorId: session.user.id,
    clientIp,
    config: {
      limit: 20,
      windowMs: 60 * 60 * 1000
    }
  });

  if (!rateLimitResult.ok) {
    return jsonError(
      429,
      "RATE_LIMITED",
      "Too many proposal decision attempts. Please retry later.",
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

  const parsed = decisionSchema.safeParse(body);

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
      route: "/api/proposals/[proposalId]/decision",
      idempotencyKey: request.headers.get("idempotency-key"),
      requestHash: createRequestHash({
        proposalId,
        action: parsed.data.action
      }),
      operation: async () => {
        const decision = await decideProposalForHomeowner(
          session.user.id,
          proposalId,
          parsed.data.action
        );

        return {
          status: 200,
          body: {
            actor: { id: session.user.id, role: session.user.role },
            decision
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

    console.error("Proposal decision failed unexpectedly", error);
    return jsonError(
      500,
      "INTERNAL_ERROR",
      "Unexpected server error.",
      undefined,
      rateLimitHeaders(rateLimitResult)
    );
  }
}
