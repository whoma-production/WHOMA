import { z } from "zod";

import { sendSupportEmail } from "@/lib/email/support";
import {
  checkRateLimit,
  clientIpFromRequestHeaders
} from "@/server/http/rate-limit";
import {
  buildEscalationDedupeKey,
  registerEscalationAttempt
} from "@/server/support/escalation-dedupe";

const escalateSchema = z
  .object({
    messages: z
      .array(
        z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string().trim().min(1).max(4000)
        })
      )
      .max(60),
    userEmail: z.string().email().nullable().optional(),
    triggeredBy: z.enum(["user_request", "auto", "escalation"]),
    conversationId: z.string().trim().min(1).max(120).optional()
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
    scope: "chat:escalate",
    actorId: "public-chat",
    clientIp,
    config: {
      limit: 8,
      windowMs: 60 * 60 * 1000
    }
  });

  if (!rateLimitResult.ok) {
    return Response.json(
      {
        success: false,
        error: "Too many escalation requests. Please retry later.",
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
      { success: false, error: "Invalid JSON body." },
      { status: 400, headers: rateLimitHeaders(rateLimitResult) }
    );
  }

  const parsed = escalateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { success: false, error: "Invalid escalate payload.", details: parsed.error.flatten() },
      { status: 400, headers: rateLimitHeaders(rateLimitResult) }
    );
  }

  const { messages, userEmail, triggeredBy, conversationId } = parsed.data;

  const dedupeResult = registerEscalationAttempt(
    buildEscalationDedupeKey({
      conversationId: conversationId ?? null,
      messages
    })
  );

  if (!dedupeResult.accepted) {
    return Response.json(
      { success: true, deduped: true, retryAfterSeconds: dedupeResult.retryAfterSeconds },
      { status: 200, headers: rateLimitHeaders(rateLimitResult) }
    );
  }

  try {
    await sendSupportEmail({
      messages,
      triggeredBy,
      ...(userEmail ? { userEmail } : {})
    });
    return Response.json(
      { success: true },
      { status: 200, headers: rateLimitHeaders(rateLimitResult) }
    );
  } catch (error) {
    console.error("Support escalation email failed", error);
    return Response.json(
      { success: false, error: "Unable to send escalation email right now." },
      { status: 502, headers: rateLimitHeaders(rateLimitResult) }
    );
  }
}
