import { NextResponse } from "next/server";
import { z } from "zod";

import { auth, type AuthSession } from "@/auth";
import { assertCan } from "@/lib/auth/rbac";
import {
  agentOnboardingSchema,
  agentWorkEmailVerificationConfirmSchema,
  agentWorkEmailVerificationSendSchema,
  parseCsvList
} from "@/lib/validation/agent-profile";
import {
  WorkEmailVerificationError,
  completeAgentOnboarding,
  confirmAgentWorkEmailVerificationCode,
  isAgentWorkEmailVerified,
  requestAgentWorkEmailVerificationCode
} from "@/server/agent-profile/service";
import {
  checkRateLimit,
  clientIpFromRequestHeaders
} from "@/server/http/rate-limit";

const actionSchema = z.enum(["send_code", "confirm_code", "complete"]);

function jsonError(
  status: number,
  code: string,
  message: string,
  details?: unknown,
  headers?: HeadersInit
): Response {
  return NextResponse.json(
    { ok: false, error: { code, message, details } },
    { status, ...(headers ? { headers } : {}) }
  );
}

function jsonSuccess(status: number, data: unknown): Response {
  return NextResponse.json({ ok: true, data }, { status });
}

function requireAgentSession(
  session: AuthSession | null
): { ok: true; userId: string } | { ok: false; response: Response } {
  if (!session?.user) {
    return {
      ok: false,
      response: jsonError(401, "UNAUTHENTICATED", "Authentication required.")
    };
  }

  if (session.user.role !== "AGENT") {
    return {
      ok: false,
      response: jsonError(
        403,
        "FORBIDDEN_ROLE",
        "Only estate agents can onboard."
      )
    };
  }

  assertCan(session.user.role, "agent:profile:onboard");

  return { ok: true, userId: session.user.id };
}

function mapWorkEmailVerificationError(error: WorkEmailVerificationError): {
  code: string;
  message: string;
  status: number;
  details?: unknown;
} {
  switch (error.code) {
    case "CODE_NOT_REQUESTED":
      return {
        code: "CODE_NOT_REQUESTED",
        message:
          "Request a verification code before trying to verify your email.",
        status: 400,
        details: error.details
      };
    case "CODE_EXPIRED":
      return {
        code: "CODE_EXPIRED",
        message:
          "Your verification code expired. Request a new code and try again.",
        status: 400,
        details: error.details
      };
    case "CODE_INVALID":
      return {
        code: "CODE_INVALID",
        message: "The verification code is invalid.",
        status: 400,
        details: error.details
      };
    case "EMAIL_MISMATCH":
      return {
        code: "EMAIL_MISMATCH",
        message: "That code was requested for a different email address.",
        status: 400,
        details: error.details
      };
    case "EMAIL_NOT_VERIFIED":
      return {
        code: "EMAIL_NOT_VERIFIED",
        message: "Verify your email before completing onboarding.",
        status: 400,
        details: error.details
      };
    case "RESEND_COOLDOWN":
      return {
        code: "RESEND_COOLDOWN",
        message: "Please wait before requesting another code.",
        status: 429,
        details: error.details
      };
    case "ATTEMPTS_EXCEEDED":
      return {
        code: "ATTEMPTS_EXCEEDED",
        message: "Too many incorrect verification attempts.",
        status: 429,
        details: error.details
      };
    case "EMAIL_DELIVERY_UNAVAILABLE":
      return {
        code: "EMAIL_DELIVERY_UNAVAILABLE",
        message: "Verification email delivery is temporarily unavailable.",
        status: 503,
        details: error.details
      };
    default:
      return {
        code: "WORK_EMAIL_VERIFICATION_FAILED",
        message: "Email verification failed.",
        status: 400,
        details: error.details
      };
  }
}

async function enforceActionRateLimit(params: {
  request: Request;
  scope: string;
  actorId: string;
  limit: number;
  windowMs: number;
}): Promise<Response | null> {
  const rateLimitResult = await checkRateLimit({
    scope: params.scope,
    actorId: params.actorId,
    clientIp: clientIpFromRequestHeaders(params.request.headers),
    config: {
      limit: params.limit,
      windowMs: params.windowMs
    }
  });

  if (rateLimitResult.ok) {
    return null;
  }

  return jsonError(
    429,
    "RATE_LIMITED",
    "Too many onboarding requests. Please retry shortly.",
    { retryAfterSeconds: rateLimitResult.retryAfterSeconds },
    { "Retry-After": String(rateLimitResult.retryAfterSeconds) }
  );
}

function parseCsvFormList(formData: FormData, key: string): string[] {
  return parseCsvList(formData.get(key)?.toString());
}

export async function POST(request: Request): Promise<Response> {
  const session = await auth();
  const sessionResult = requireAgentSession(session);

  if (!sessionResult.ok) {
    return sessionResult.response;
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonError(400, "VALIDATION_FAILED", "Request must be form data.");
  }

  const action = actionSchema.safeParse(formData.get("action"));
  if (!action.success) {
    return jsonError(400, "VALIDATION_FAILED", "Unknown onboarding action.");
  }

  if (action.data === "send_code") {
    const rateLimited = await enforceActionRateLimit({
      request,
      scope: "agent:onboarding:work-email:send",
      actorId: sessionResult.userId,
      limit: 15,
      windowMs: 60 * 60 * 1000
    });
    if (rateLimited) {
      return rateLimited;
    }

    const parsed = agentWorkEmailVerificationSendSchema.safeParse({
      workEmail: formData.get("workEmail")
    });
    if (!parsed.success) {
      return jsonError(
        400,
        "VALIDATION_FAILED",
        "Enter a valid email address."
      );
    }

    try {
      const result = await requestAgentWorkEmailVerificationCode(
        sessionResult.userId,
        parsed.data.workEmail
      );

      return jsonSuccess(200, {
        sent: true,
        devCode: result.devCode ?? null
      });
    } catch (error) {
      if (error instanceof WorkEmailVerificationError) {
        const mapped = mapWorkEmailVerificationError(error);
        return jsonError(
          mapped.status,
          mapped.code,
          mapped.message,
          mapped.details
        );
      }

      return jsonError(500, "SEND_FAILED", "Could not send verification code.");
    }
  }

  if (action.data === "confirm_code") {
    const rateLimited = await enforceActionRateLimit({
      request,
      scope: "agent:onboarding:work-email:confirm",
      actorId: sessionResult.userId,
      limit: 25,
      windowMs: 60 * 60 * 1000
    });
    if (rateLimited) {
      return rateLimited;
    }

    const parsed = agentWorkEmailVerificationConfirmSchema.safeParse({
      workEmail: formData.get("workEmail"),
      verificationCode: formData.get("verificationCode")
    });
    if (!parsed.success) {
      return jsonError(
        400,
        "VALIDATION_FAILED",
        "Enter the latest 6-digit code."
      );
    }

    try {
      await confirmAgentWorkEmailVerificationCode(
        sessionResult.userId,
        parsed.data.workEmail,
        parsed.data.verificationCode
      );

      return jsonSuccess(200, { verified: true });
    } catch (error) {
      if (error instanceof WorkEmailVerificationError) {
        const mapped = mapWorkEmailVerificationError(error);
        return jsonError(
          mapped.status,
          mapped.code,
          mapped.message,
          mapped.details
        );
      }

      return jsonError(
        400,
        "CODE_INVALID",
        "The verification code is invalid."
      );
    }
  }

  const parsed = agentOnboardingSchema.safeParse({
    fullName: formData.get("fullName"),
    workEmail: formData.get("workEmail"),
    phone: formData.get("phone"),
    agencyName: formData.get("agencyName"),
    jobTitle: formData.get("jobTitle"),
    yearsExperience: formData.get("yearsExperience"),
    bio: formData.get("bio"),
    serviceAreas: parseCsvFormList(formData, "serviceAreas"),
    specialties: parseCsvFormList(formData, "specialties"),
    achievements: parseCsvFormList(formData, "achievements"),
    languages: parseCsvFormList(formData, "languages"),
    feePreference: formData.get("feePreference"),
    transactionBand: formData.get("transactionBand"),
    collaborationPreference: formData.get("collaborationPreference"),
    responseTimeMinutes: formData.get("responseTimeMinutes")
  });

  if (!parsed.success) {
    return jsonError(
      400,
      "VALIDATION_FAILED",
      "Please review your onboarding details.",
      parsed.error.flatten()
    );
  }

  const workEmailVerified = await isAgentWorkEmailVerified(
    sessionResult.userId,
    parsed.data.workEmail
  );
  if (!workEmailVerified) {
    return jsonError(
      400,
      "EMAIL_NOT_VERIFIED",
      "Verify your email before completing onboarding."
    );
  }

  try {
    await completeAgentOnboarding(sessionResult.userId, parsed.data);
    return jsonSuccess(200, { completed: true });
  } catch (error) {
    if (error instanceof WorkEmailVerificationError) {
      const mapped = mapWorkEmailVerificationError(error);
      return jsonError(
        mapped.status,
        mapped.code,
        mapped.message,
        mapped.details
      );
    }

    return jsonError(400, "VALIDATION_FAILED", "Please review your details.");
  }
}
