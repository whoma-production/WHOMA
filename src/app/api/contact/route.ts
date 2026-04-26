import { z } from "zod";

import {
  checkRateLimit,
  clientIpFromRequestHeaders
} from "@/server/http/rate-limit";
import {
  createSupportInquiry,
  supportInquirySchema
} from "@/server/support/inquiries";

export const runtime = "nodejs";

const contactPayloadSchema = supportInquirySchema
  .pick({
    name: true,
    email: true,
    role: true,
    category: true,
    message: true,
    pagePath: true,
    source: true
  })
  .strict();

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

export async function POST(req: Request): Promise<Response> {
  const clientIp = clientIpFromRequestHeaders(req.headers);
  const rateLimitResult = await checkRateLimit({
    scope: "contact:submit",
    actorId: "public-contact",
    clientIp,
    config: {
      limit: 12,
      windowMs: 60 * 60 * 1000
    }
  });

  if (!rateLimitResult.ok) {
    return Response.json(
      {
        error: "Too many contact requests. Please retry later.",
        retryAfterSeconds: rateLimitResult.retryAfterSeconds
      },
      {
        status: 429,
        headers: {
          ...rateLimitHeaders(rateLimitResult),
          "Retry-After": String(rateLimitResult.retryAfterSeconds)
        }
      }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { error: "Invalid JSON body." },
      { status: 400, headers: rateLimitHeaders(rateLimitResult) }
    );
  }

  const parsed = contactPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid contact request.", details: parsed.error.flatten() },
      { status: 400, headers: rateLimitHeaders(rateLimitResult) }
    );
  }

  try {
    await createSupportInquiry({
      ...parsed.data,
      source: parsed.data.source ?? "/contact"
    });

    return Response.json(
      { success: true },
      { headers: rateLimitHeaders(rateLimitResult) }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "Invalid contact request.", details: error.flatten() },
        { status: 400, headers: rateLimitHeaders(rateLimitResult) }
      );
    }

    console.error("Contact request failed", error);
    return Response.json(
      { error: "Unable to submit contact request right now." },
      { status: 503, headers: rateLimitHeaders(rateLimitResult) }
    );
  }
}
